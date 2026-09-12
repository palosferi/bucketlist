const photoStoreLib = require('../../lib/photoStore');

/**
 * Accepts photos for an adventure the user owns. Each file is re-encoded and
 * EXIF-stripped by the photo store before it ever touches disk.
 */
module.exports = (objRepo) => {
  const photoStore = objRepo.photoStore;
  return async (req, res, next) => {
    if (req.method !== 'POST') return next();
    const files = req.files || [];
    if (!files.length) return next();

    const adventure = res.locals.adventure;
    const room = photoStoreLib.MAX_PHOTOS_PER_ADVENTURE - adventure.photos.length;
    if (room <= 0) {
      res.status(400);
      res.locals.errors = {
        photos: `An adventure can hold ${photoStoreLib.MAX_PHOTOS_PER_ADVENTURE} photos.`,
      };
      return next();
    }

    try {
      for (const file of files.slice(0, room)) {
        const stored = await photoStore.store(res.locals.currentUser._id, file.buffer);
        adventure.photos.push(stored);
      }
      await adventure.save();
      return res.redirect(`/adventures/${adventure._id}/edit`);
    } catch (err) {
      if (err.name === 'QuotaError' || err.status === 400) {
        res.status(err.status || 400);
        res.locals.errors = { photos: err.message };
        return next();
      }
      return next(err);
    }
  };
};
