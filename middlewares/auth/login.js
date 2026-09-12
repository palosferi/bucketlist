const bcrypt = require('bcryptjs');

/**
 * Verifies credentials and starts a session.
 *
 * Wrong email and wrong password are answered identically, and a dummy hash is
 * compared when the account does not exist, so response timing does not reveal
 * which emails are registered.
 */
// Must stay a REAL bcrypt hash (cost 12) of an unknown string: bcrypt.compare
// returns immediately on a malformed hash, which would reintroduce the timing
// leak this exists to close. Measured at ~240ms, matching a genuine compare.
const DUMMY_HASH = '$2a$12$QjlXfz0MEmEnx/LAwz.yoegRS7KIKSlNgR8VLjFv2clvejwbNzIRy';

module.exports = (objRepo) => {
  const UserModel = objRepo.UserModel;
  return async (req, res, next) => {
    if (req.method !== 'POST') return next();

    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    try {
      const user = await UserModel.findOne({ email });
      const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

      if (!user || !ok) {
        res.status(401);
        res.locals.errors = { form: 'Email or password is incorrect.' };
        res.locals.form = { email };
        return next();
      }

      const returnTo = req.session.returnTo;
      return req.session.regenerate((err) => {
        if (err) return next(err);
        req.session.userId = user._id.toString();
        req.session.issuedAt = Date.now();
        return res.redirect(safeRedirect(returnTo) || '/lists');
      });
    } catch (err) {
      return next(err);
    }
  };
};

/** Only same-site relative paths, so returnTo cannot become an open redirect. */
function safeRedirect(target) {
  if (typeof target !== 'string') return null;
  if (!target.startsWith('/') || target.startsWith('//')) return null;
  return target;
}
