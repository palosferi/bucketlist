const { parseAdventure, ValidationError } = require('../../lib/validate');

/**
 * Creates or updates an adventure. A no-op on GET, so one chain serves both
 * the form and its submission — the pattern the rest of the app uses.
 */
module.exports = (objRepo) => {
  const { AdventureModel, ListModel } = objRepo;
  return async (req, res, next) => {
    if (req.method !== 'POST') return next();

    let fields;
    try {
      fields = parseAdventure(req.body);
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400);
        res.locals.errors = err.errors;
        res.locals.form = req.body;
        return next();
      }
      return next(err);
    }

    try {
      // The target list must belong to the current user, or a crafted form
      // could file an adventure into somebody else's list.
      const list = await ListModel.findOne({
        _id: req.body._list,
        _owner: res.locals.currentUser._id,
      });
      if (!list) {
        res.status(400);
        res.locals.errors = { _list: 'Pick one of your own lists.' };
        res.locals.form = req.body;
        return next();
      }

      const adventure =
        res.locals.adventure ||
        new AdventureModel({ _owner: res.locals.currentUser._id });

      adventure._list = list._id;
      adventure.name = fields.name;
      adventure.type = fields.type;
      adventure.date = fields.date;
      adventure.done = fields.done;
      adventure.shareUndone = fields.shareUndone;
      adventure.country = fields.country;
      adventure.placeName = fields.placeName;
      adventure.latitude = fields.latitude;
      adventure.longitude = fields.longitude;
      adventure.description = fields.description;

      await adventure.save();
      return res.redirect(`/lists/${list._id}`);
    } catch (err) {
      return next(err);
    }
  };
};
