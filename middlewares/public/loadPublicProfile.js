const { countryName } = require('../../lib/countries');

/**
 * Builds a user's public page: the adventures they chose to make public,
 * grouped by country for the map.
 *
 * Everything here goes through toPublicJSON(), so placeName and exact
 * coordinates cannot reach a public template even by accident.
 */
module.exports = (objRepo) => {
  const { UserModel, ListModel, AdventureModel } = objRepo;
  return async (req, res, next) => {
    try {
      const handle = String(req.params.handle || '').toLowerCase();
      const owner = await UserModel.findOne({ handle }).select('handle displayName createdAt');
      if (!owner) return res.status(404).render('404', res.locals);

      const publicLists = await ListModel.find({ _owner: owner._id, visibility: 'public' }).select('_id name');
      const listIds = publicLists.map((l) => l._id);

      // Filtered in the query, not in the view: an unfinished adventure that
      // was not explicitly opted in never reaches a public template at all.
      const adventures = await AdventureModel.find({
        _list: { $in: listIds },
        $or: [{ done: true }, { shareUndone: true }],
      }).sort({ date: -1, createdAt: -1 });

      const byCountry = new Map();
      for (const adv of adventures) {
        if (!adv.country) continue;
        if (!byCountry.has(adv.country)) {
          byCountry.set(adv.country, { code: adv.country, name: countryName(adv.country), adventures: [] });
        }
        byCountry.get(adv.country).adventures.push(adv.toPublicJSON());
      }

      res.locals.profile = {
        handle: owner.handle,
        displayName: owner.displayName,
        memberSince: owner.createdAt,
      };
      res.locals.publicLists = publicLists;
      res.locals.publicAdventures = adventures.map((a) => a.toPublicJSON());
      res.locals.mapCountries = [...byCountry.values()].sort((a, b) => a.name.localeCompare(b.name, 'en'));
      return next();
    } catch (err) {
      return next(err);
    }
  };
};
