const config = require('../../lib/config');
/**
 * Streams everything held about the account as JSON.
 *
 * Required by GDPR article 15 (right of access) and article 20 (portability),
 * and genuinely useful: it is the escape hatch that makes trusting the service
 * with years of entries reasonable.
 */
module.exports = (objRepo) => {
  const { ListModel, AdventureModel } = objRepo;
  return async (req, res, next) => {
    try {
      const user = res.locals.currentUser;

      const lists = await ListModel.find({ _owner: user._id }).lean();
      const adventures = await AdventureModel.find({ _owner: user._id }).lean();

      const payload = {
        exportedAt: new Date().toISOString(),
        account: {
          email: user.email,
          handle: user.handle,
          displayName: user.displayName,
          createdAt: user.createdAt,
          emailVerifiedAt: user.emailVerifiedAt,
          storageUsedBytes: user.storageUsedBytes,
        },
        lists: lists.map((l) => ({
          id: String(l._id),
          name: l.name,
          visibility: l.visibility,
          createdAt: l.createdAt,
        })),
        adventures: adventures.map((a) => ({
          id: String(a._id),
          listId: String(a._list),
          name: a.name,
          type: a.type,
          date: a.date,
          done: a.done,
          shareUndone: a.shareUndone,
          country: a.country,
          placeName: a.placeName,
          latitude: a.latitude,
          longitude: a.longitude,
          description: a.description,
          // Photo bytes are not inlined; the URLs work while logged in.
          photos: (a.photos || []).map((p) => ({
            url: config.path(`/photos/${p.filename}`),
            caption: p.caption,
            bytes: p.bytes,
            uploadedAt: p.createdAt,
          })),
          createdAt: a.createdAt,
        })),
      };

      const stamp = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="adventures-${user.handle}-${stamp}.json"`);
      return res.end(JSON.stringify(payload, null, 2));
    } catch (err) {
      return next(err);
    }
  };
};
