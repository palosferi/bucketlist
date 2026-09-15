const config = require('../../lib/config');
const bcrypt = require('bcryptjs');
const TokenModel = require('../../models/token');

/**
 * Deletes the account and everything belonging to it, for real.
 *
 * Required by GDPR article 17. The password is demanded first so a borrowed
 * session cannot wipe someone's history, and the handle is typed back as a
 * deliberate confirmation step.
 */
module.exports = (objRepo) => {
  const { UserModel, ListModel, AdventureModel, photoStore } = objRepo;
  return async (req, res, next) => {
    const user = res.locals.currentUser;

    try {
      const full = await UserModel.findById(user._id).select('+passwordHash');
      const ok = await bcrypt.compare(String(req.body.password || ''), full.passwordHash);
      if (!ok) {
        res.status(403);
        res.locals.errors = { deletePassword: 'Password does not match.' };
        return next();
      }
      if (String(req.body.confirmHandle || '').trim().toLowerCase() !== user.handle) {
        res.status(400);
        res.locals.errors = { confirmHandle: `Type ${user.handle} to confirm.` };
        return next();
      }

      // Photo files first: losing the database rows before the blobs would
      // orphan them on disk with nothing left pointing at them.
      const adventures = await AdventureModel.find({ _owner: user._id }).select('photos');
      for (const adv of adventures) {
        for (const photo of adv.photos) await photoStore.remove(photo.filename);
      }

      await AdventureModel.deleteMany({ _owner: user._id });
      await ListModel.deleteMany({ _owner: user._id });
      await TokenModel.deleteMany({ _user: user._id });
      await UserModel.deleteOne({ _id: user._id });

      return req.session.destroy(() => {
        // Must match the path the cookie was set with, or the browser keeps a
        // scoped bl.sid behind after the server-side session is gone.
        res.clearCookie('bl.sid', { path: config.basePath || '/' });
        return res.redirect('/?deleted=1');
      });
    } catch (err) {
      return next(err);
    }
  };
};
