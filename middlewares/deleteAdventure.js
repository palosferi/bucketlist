/**
 * torli az adventure-t a db-bol
 * @param objRepo
 * @returns {function(*, *, *): * }
 */
module.exports = (objRepo) => {
  const AdventureModel = objRepo.AdventureModel;
  return async (req, res, next) => {
    try {
      const id = req.params.id;
      if (!id) {
        return res.redirect('/adventures');
      }

      await AdventureModel.deleteOne({ _id: id });
      return res.redirect('/adventures');
    } catch (err) {
      return next(err);
    }
  };
};