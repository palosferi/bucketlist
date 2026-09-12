/**
 * Deletes a list, its adventures, and the photo files they own.
 * Refuses to remove the user's last remaining list.
 */
module.exports = (objRepo) => {
  const { ListModel, AdventureModel, photoStore } = objRepo;
  return async (req, res, next) => {
    try {
      const list = res.locals.list;
      const remaining = await ListModel.countDocuments({ _owner: res.locals.currentUser._id });
      if (remaining <= 1) {
        res.locals.errors = { form: 'You need at least one list.' };
        return next();
      }

      const adventures = await AdventureModel.find({ _list: list._id });
      let freed = 0;
      for (const adv of adventures) {
        for (const photo of adv.photos) {
          freed += photo.bytes;
          await photoStore.remove(photo.filename);
        }
      }

      await AdventureModel.deleteMany({ _list: list._id });
      await list.deleteOne();
      await photoStore.releaseQuota(res.locals.currentUser._id, freed);

      return res.redirect('/lists');
    } catch (err) {
      return next(err);
    }
  };
};
