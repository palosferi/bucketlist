/**
 * Loads a list shared by token (visibility 'unlisted') or made public.
 * Deliberately renders the same read-only view as a public list.
 */
module.exports = (objRepo) => {
  const { ListModel, AdventureModel, UserModel } = objRepo;
  return async (req, res, next) => {
    try {
      const list = await ListModel.findById(req.params.listId);
      if (!list) return res.status(404).render('404', res.locals);

      const token = String(req.query.t || '');
      const allowed =
        list.visibility === 'public' ||
        (list.visibility === 'unlisted' && token && token === list.shareToken);
      if (!allowed) return res.status(404).render('404', res.locals);

      const owner = await UserModel.findById(list._owner).select('handle displayName');
      // Same rule as the public profile: a shared link is still a public page.
      const adventures = await AdventureModel.find({
        _list: list._id,
        $or: [{ done: true }, { shareUndone: true }],
      }).sort({ done: 1, date: 1 });

      res.locals.sharedList = { id: list._id, name: list.name, visibility: list.visibility };
      res.locals.sharedOwner = owner;
      res.locals.shareToken = token;
      res.locals.publicAdventures = adventures.map((a) => a.toPublicJSON());
      return next();
    } catch (err) {
      if (err.name === 'CastError') return res.status(404).render('404', res.locals);
      return next(err);
    }
  };
};
