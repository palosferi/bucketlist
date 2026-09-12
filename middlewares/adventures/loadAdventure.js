/**
 * Loads one adventure owned by the current user, plus the lists it could be
 * moved to. Ownership is in the query, not a check afterwards.
 */
module.exports = (objRepo) => {
  const { AdventureModel, ListModel } = objRepo;
  return async (req, res, next) => {
    try {
      const adventure = await AdventureModel.findOne({
        _id: req.params.id,
        _owner: res.locals.currentUser._id,
      });
      if (!adventure) return res.status(404).render('404', res.locals);

      res.locals.adventure = adventure;
      res.locals.lists = await ListModel.find({ _owner: res.locals.currentUser._id }).sort({ name: 1 });
      return next();
    } catch (err) {
      if (err.name === 'CastError') return res.status(404).render('404', res.locals);
      return next(err);
    }
  };
};
