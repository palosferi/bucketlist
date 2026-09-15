/** Removes a single photo from an adventure and frees its quota. */
module.exports = (objRepo) => {
  const photoStore = objRepo.photoStore;
  return async (req, res, next) => {
    try {
      const adventure = res.locals.adventure;
      const photo = adventure.photos.id(req.params.photoId);
      if (!photo) return res.status(404).render('404', res.locals);

      const bytes = photo.bytes;
      const filename = photo.filename;
      adventure.photos.pull({ _id: photo._id });

      await adventure.save();
      await photoStore.remove(filename);
      await photoStore.releaseQuota(res.locals.currentUser._id, bytes);

      return res.redirect(`/adventures/${adventure._id}/edit`);
    } catch (err) {
      return next(err);
    }
  };
};
