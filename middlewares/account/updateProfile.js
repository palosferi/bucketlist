const bcrypt = require('bcryptjs');

const { parseProfile, ValidationError } = require('../../lib/validate');
const TokenModel = require('../../models/token');
const mailer = require('../../lib/mailer');
const config = require('../../lib/config');
const { VERIFY_TTL_MS } = require('../auth/verifyEmail');

/**
 * Updates display name, handle and email.
 *
 * Changing the email address requires the current password: an address is the
 * account-recovery route, so a borrowed session must not be able to take it
 * over. Name and handle do not, since neither grants access.
 *
 * Changing the handle moves the public map to a new URL and the old one stops
 * resolving; the form says so rather than silently breaking shared links.
 */
module.exports = (objRepo) => {
  const UserModel = objRepo.UserModel;
  return async (req, res, next) => {
    if (req.method !== 'POST') return next();

    let fields;
    try {
      fields = parseProfile(req.body);
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400);
        res.locals.errors = err.errors;
        res.locals.form = req.body;
        return next();
      }
      return next(err);
    }

    try {
      const user = await UserModel.findById(res.locals.currentUser._id);
      const emailChanged = fields.email !== user.email;
      const handleChanged = fields.handle !== user.handle;

      if (emailChanged) {
        const ok = await bcrypt.compare(String(req.body.currentPassword || ''), user.passwordHash);
        if (!ok) {
          res.status(403);
          res.locals.errors = { profilePassword: 'Enter your current password to change your email.' };
          res.locals.form = req.body;
          return next();
        }
      }

      if (emailChanged || handleChanged) {
        const clash = await UserModel.findOne({
          _id: { $ne: user._id },
          $or: [{ email: fields.email }, { handle: fields.handle }],
        });
        if (clash) {
          res.status(409);
          res.locals.errors =
            clash.email === fields.email
              ? { email: 'Another account already uses that email.' }
              : { handle: 'That handle is taken.' };
          res.locals.form = req.body;
          return next();
        }
      }

      user.displayName = fields.displayName;
      user.handle = fields.handle;

      let notice = 'Profile updated.';
      if (emailChanged) {
        user.email = fields.email;

        if (config.resendApiKey) {
          // Normal path: the new address must prove itself before it can be
          // used to publish or to recover the account.
          user.emailVerifiedAt = null;
          await user.save();
          try {
            const raw = await TokenModel.issue(user._id, 'verify-email', VERIFY_TTL_MS);
            await mailer.sendVerification(user.email, raw);
          } catch (err) {
            console.error('[mail] verification send failed on email change:', err.message);
          }
          notice = 'Email changed — confirm the new address from the link we sent.';
        } else {
          // No mail provider is configured, so requiring verification would
          // strand the account with no way to verify and no way to publish.
          // Accounts on such an instance are created and recovered from the
          // command line by the operator, so the address is taken on trust.
          await user.save();
          notice = 'Email changed. No mail provider is configured, so it was not re-verified.';
        }
      } else {
        await user.save();
      }

      if (handleChanged) notice += ` Your public map is now at ${config.url('/u/' + user.handle)}`;

      req.session.flash = notice;
      return res.redirect('/settings');
    } catch (err) {
      return next(err);
    }
  };
};
