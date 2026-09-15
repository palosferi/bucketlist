const fs = require('fs');
const photoStoreLib = require('../../lib/photoStore');

/**
 * Serves a stored photo.
 *
 * Photos are served through the app rather than as a static directory because
 * a photo attached to a private adventure must stay private: the viewer has to
 * either own it or be looking at something its owner made public.
 */
module.exports = (objRepo) => {
  const { AdventureModel, ListModel } = objRepo;
  return async (req, res, next) => {
    const filename = String(req.params.filename || '');
    if (!/^[a-f0-9]{32}\.webp$/.test(filename)) return res.status(404).end();

    try {
      const adventure = await AdventureModel.findOne({ 'photos.filename': filename });
      if (!adventure) return res.status(404).end();

      const viewerId = res.locals.currentUser && res.locals.currentUser._id;
      const isOwner = viewerId && String(adventure._owner) === String(viewerId);

      if (!isOwner) {
        // The adventure's own rule comes first: a photo on an unfinished,
        // not-opted-in adventure stays private even on a public list.
        if (!adventure.isPubliclyVisible()) return res.status(404).end();

        const list = await ListModel.findById(adventure._list).select('visibility shareToken');
        const shared =
          list &&
          (list.visibility === 'public' ||
            (list.visibility === 'unlisted' && req.query.t && req.query.t === list.shareToken));
        if (!shared) return res.status(404).end();
      }

      const file = photoStoreLib.shardPathFor(filename);
      if (!fs.existsSync(file)) return res.status(404).end();

      res.type('image/webp');
      // Content is immutable — the filename is random and never reused.
      // Deliberately not a shared-cacheable response. A list can be switched
      // back to private, or a photo deleted, and an intermediary holding a
      // week-long immutable copy would keep serving it past the point where
      // this authorisation check would refuse.
      res.set('Cache-Control', 'private, max-age=3600, must-revalidate');
      return fs.createReadStream(file).pipe(res);
    } catch (err) {
      return next(err);
    }
  };
};
