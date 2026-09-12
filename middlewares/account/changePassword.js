const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 12;

/** Changes the password, requiring the current one as proof. */
module.exports = (objRepo) => {
  const UserModel = objRepo.UserModel;
  return async (req, res, next) => {
    if (req.method !== 'POST') return next();

    const current = String(req.body.currentPassword || '');
    const next_ = String(req.body.newPassword || '');

    try {
      const user = await UserModel.findById(res.locals.currentUser._id).select('+passwordHash');
      const ok = await bcrypt.compare(current, user.passwordHash);
      if (!ok) {
        res.status(403);
        res.locals.errors = { currentPassword: 'That is not your current password.' };
        return next();
      }
      if (next_.length < 10 || next_.length > 200) {
        res.status(400);
        res.locals.errors = { newPassword: 'Use between 10 and 200 characters.' };
        return next();
      }

      user.passwordHash = await bcrypt.hash(next_, BCRYPT_ROUNDS);
      // Logs out every other device. The session doing the change is re-stamped
      // just below so the person making it stays logged in.
      user.sessionsValidFrom = new Date();
      await user.save();

      req.session.issuedAt = Date.now();
      req.session.flash = 'Password updated. Other devices have been logged out.';
      return res.redirect('/settings');
    } catch (err) {
      return next(err);
    }
  };
};
