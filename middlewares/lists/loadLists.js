/**
 * Loads the current user's own lists, with a count of adventures in each.
 */
module.exports = (objRepo) => {
  const { ListModel, AdventureModel } = objRepo;
  return async (req, res, next) => {
    try {
      const lists = await ListModel.find({ _owner: res.locals.currentUser._id })
        .sort({ isDefault: -1, createdAt: 1 })
        .lean();

      const counts = await AdventureModel.aggregate([
        { $match: { _owner: res.locals.currentUser._id } },
        { $group: { _id: '$_list', n: { $sum: 1 } } },
      ]);
      const byList = new Map(counts.map((c) => [String(c._id), c.n]));

      res.locals.lists = lists.map((l) => ({ ...l, adventureCount: byList.get(String(l._id)) || 0 }));
      return next();
    } catch (err) {
      return next(err);
    }
  };
};
