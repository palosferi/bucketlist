/**
 * Resolves req.session.userId into res.locals.currentUser for every request.
 * Runs before the routes so views can render the nav without each route
 * having to fetch the user itself.
 */
module.exports = (objRepo) => {
  const UserModel = objRepo.UserModel;
  return async (req, res, next) => {
    res.locals.currentUser = null;
    if (!req.session || !req.session.userId) return next();
    try {
      const user = await UserModel.findById(req.session.userId).select('-passwordHash');
      if (!user) {
        // Session outlived the account. regenerate rather than destroy: later
        // middleware (csrf) requires req.session to exist.
        return req.session.regenerate(() => next());
      }
      // Refuse a session minted before the account's cutoff (password change
      // or reset), which is what logs other devices out.
      const issuedAt = req.session.issuedAt || 0;
      if (user.sessionsValidFrom && issuedAt < user.sessionsValidFrom.getTime()) {
        return req.session.regenerate(() => next());
      }

      res.locals.currentUser = user;
      return next();
    } catch (err) {
      return next(err);
    }
  };
};
