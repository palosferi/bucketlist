const { countryName } = require('../../lib/countries');
const { colorHex } = require('../../lib/colors');

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

      const publicLists = await ListModel.find({ _owner: owner._id, visibility: 'public' }).select('_id name color');
      const listIds = publicLists.map((l) => l._id);

      // Filtered in the query, not in the view: an unfinished adventure that
      // was not explicitly opted in never reaches a public template at all.
      const adventures = await AdventureModel.find({
        _list: { $in: listIds },
        $or: [{ done: true }, { shareUndone: true }],
      })
        .populate('_list', 'name color')
        .sort({ date: -1, createdAt: -1 });

      const byCountry = new Map();
      for (const adv of adventures) {
        if (!adv.country) continue;
        if (!byCountry.has(adv.country)) {
          byCountry.set(adv.country, {
            code: adv.country,
            name: countryName(adv.country),
            adventures: [],
            listTally: new Map(),
          });
        }
        const entry = byCountry.get(adv.country);
        entry.adventures.push(adv.toPublicJSON());

        // A country can hold adventures from several lists. It gets one fill,
        // so the list contributing the most adventures there wins.
        const list = adv._list;
        if (list) {
          const key = String(list._id);
          const seen = entry.listTally.get(key) || { name: list.name, color: list.color, count: 0 };
          seen.count += 1;
          entry.listTally.set(key, seen);
        }
      }

      for (const entry of byCountry.values()) {
        const dominant = [...entry.listTally.values()].sort((a, b) => b.count - a.count)[0];
        entry.color = colorHex(dominant && dominant.color);
        entry.listName = dominant ? dominant.name : null;
        delete entry.listTally;
      }

      res.locals.profile = {
        handle: owner.handle,
        displayName: owner.displayName,
        memberSince: owner.createdAt,
      };
      res.locals.publicLists = publicLists.map((l) => ({ id: l._id, name: l.name, color: colorHex(l.color) }));
      res.locals.publicAdventures = adventures.map((a) => a.toPublicJSON());
      res.locals.mapCountries = [...byCountry.values()].sort((a, b) => a.name.localeCompare(b.name, 'en'));
      return next();
    } catch (err) {
      return next(err);
    }
  };
};
