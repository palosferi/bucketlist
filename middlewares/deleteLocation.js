/**
 * torli a location-t a db-bol
 * @param objRepo
 * @returns {function(*, *, *): * }
 */
const mongoose = require('mongoose');

module.exports = (objRepo) => {
  const LocationModel = objRepo.LocationModel;

  return async (req, res, next) => {
    try {
      const id = req.params.id;
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.redirect('/locations');
      }
      await LocationModel.deleteOne({ _id: id });
      return res.redirect('/locations');
    } catch (err) {
      return next(err);
    }
  };
};
