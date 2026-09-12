/** Deletes an adventure and reclaims the disk its photos were using. */
module.exports = (objRepo) => {
  const photoStore = objRepo.photoStore;
  return async (req, res, next) => {
    try {
      const adventure = res.locals.adventure;
      const listId = adventure._list;

      let freed = 0;
      for (const photo of adventure.photos) {
        freed += photo.bytes;
        await photoStore.remove(photo.filename);
      }

      await adventure.deleteOne();
      await photoStore.releaseQuota(res.locals.currentUser._id, freed);

      return res.redirect(`/lists/${listId}`);
    } catch (err) {
      return next(err);
    }
  };
};
