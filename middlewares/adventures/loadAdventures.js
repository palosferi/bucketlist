/** Loads every adventure the current user owns, newest first. */
module.exports = (objRepo) => {
  const AdventureModel = objRepo.AdventureModel;
  return async (req, res, next) => {
    try {
      res.locals.adventures = await AdventureModel.find({ _owner: res.locals.currentUser._id })
        .populate('_list', 'name visibility')
        .sort({ done: 1, date: 1, createdAt: -1 });
      return next();
    } catch (err) {
      return next(err);
    }
  };
};
