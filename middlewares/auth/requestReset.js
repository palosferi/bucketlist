const TokenModel = require('../../models/token');
const mailer = require('../../lib/mailer');

const RESET_TTL_MS = 60 * 60 * 1000;

/**
 * Starts a password reset.
 *
 * Always reports the same thing whether or not the address is registered —
 * otherwise this endpoint becomes a way to enumerate which emails have
 * accounts. The work is done after the response is decided, not before.
 */
module.exports = (objRepo) => {
  const UserModel = objRepo.UserModel;
  return async (req, res, next) => {
    if (req.method !== 'POST') return next();

    const email = String(req.body.email || '').trim().toLowerCase();

    try {
      const user = email ? await UserModel.findOne({ email }) : null;
      if (user) {
        const raw = await TokenModel.issue(user._id, 'reset-password', RESET_TTL_MS);
        try {
          await mailer.sendPasswordReset(user.email, raw);
        } catch (err) {
          console.error('[mail] reset send failed:', err.message);
        }
      }
    } catch (err) {
      return next(err);
    }

    res.locals.resetRequested = true;
    return next();
  };
};

module.exports.RESET_TTL_MS = RESET_TTL_MS;
