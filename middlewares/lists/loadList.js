/**
 * Loads one list *belonging to the current user* plus its adventures.
 *
 * Ownership is part of the query rather than a check afterwards, so another
 * user's list id simply finds nothing — there is no code path where a record
 * is fetched first and authorised second.
 */
module.exports = (objRepo) => {
  const { ListModel, AdventureModel } = objRepo;
  return async (req, res, next) => {
    try {
      const list = await ListModel.findOne({
        _id: req.params.listId,
        _owner: res.locals.currentUser._id,
      });
      if (!list) return res.status(404).render('404', res.locals);

      res.locals.list = list;
      res.locals.adventures = await AdventureModel.find({ _list: list._id })
        .sort({ done: 1, date: 1, createdAt: -1 });
      return next();
    } catch (err) {
      if (err.name === 'CastError') return res.status(404).render('404', res.locals);
      return next(err);
    }
  };
};
