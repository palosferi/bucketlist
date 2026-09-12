const bcrypt = require('bcryptjs');
const { parseSignup, ValidationError } = require('../../lib/validate');
const TokenModel = require('../../models/token');
const mailer = require('../../lib/mailer');
const { VERIFY_TTL_MS } = require('./verifyEmail');

const BCRYPT_ROUNDS = 12;

/**
 * Creates the account, its default list, and logs the new user straight in.
 * A no-op on GET so the same route serves the form and its submission.
 */
module.exports = (objRepo) => {
  const { UserModel, ListModel } = objRepo;
  return async (req, res, next) => {
    if (req.method !== 'POST') return next();

    let fields;
    try {
      fields = parseSignup(req.body);
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400);
        res.locals.errors = err.errors;
        res.locals.form = { ...req.body, password: '' };
        return next();
      }
      return next(err);
    }

    try {
      const clash = await UserModel.findOne({
        $or: [{ email: fields.email }, { handle: fields.handle }],
      });
      if (clash) {
        res.status(409);
        res.locals.errors =
          clash.email === fields.email
            ? { email: 'An account with that email already exists.' }
            : { handle: 'That handle is taken.' };
        res.locals.form = { ...req.body, password: '' };
        return next();
      }

      const user = await UserModel.create({
        email: fields.email,
        handle: fields.handle,
        displayName: fields.displayName,
        passwordHash: await bcrypt.hash(fields.password, BCRYPT_ROUNDS),
      });

      await ListModel.create({
        name: 'My Bucketlist',
        _owner: user._id,
        visibility: 'private',
        isDefault: true,
      });

      // Mail failure must not fail the signup — the account exists and the
      // user can request another link from their settings.
      try {
        const raw = await TokenModel.issue(user._id, 'verify-email', VERIFY_TTL_MS);
        await mailer.sendVerification(user.email, raw);
      } catch (err) {
        console.error('[mail] verification send failed at signup:', err.message);
      }

      // Prevents session fixation: the pre-login session id is discarded.
      return req.session.regenerate((err) => {
        if (err) return next(err);
        req.session.userId = user._id.toString();
        req.session.issuedAt = Date.now();
        return res.redirect('/lists');
      });
    } catch (err) {
      return next(err);
    }
  };
};
