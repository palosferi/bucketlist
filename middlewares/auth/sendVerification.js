const TokenModel = require('../../models/token');
const mailer = require('../../lib/mailer');
const { VERIFY_TTL_MS } = require('./verifyEmail');

/**
 * Issues a fresh verification link for the logged-in user.
 * Mail failures are logged but never surfaced as an error page — the user is
 * told to check their inbox either way.
 */
module.exports = () => {
  return async (req, res, next) => {
    const user = res.locals.currentUser;
    if (!user || user.isVerified()) return res.redirect('/lists');

    try {
      const raw = await TokenModel.issue(user._id, 'verify-email', VERIFY_TTL_MS);
      await mailer.sendVerification(user.email, raw);
    } catch (err) {
      console.error('[mail] verification send failed:', err.message);
    }

    req.session.flash = 'Verification email sent — check your inbox.';
    return res.redirect('/lists');
  };
};
