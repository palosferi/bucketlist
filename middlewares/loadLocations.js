/**
 * db bol az osszes location-t betolti
 * @param objRepo
 * @returns {function(*, *, *): * }
 */
module.exports = (objRepo) => {
  const LocationModel = objRepo.LocationModel;
  return async (req, res, next) => {
    try {
      const locations = await LocationModel.find({});
      res.locals.locations = locations;
      next();
    } catch (err) {
      next(err);
    }
  };
};