/**
 * Loads every location from the db
 * @param objRepo
 * @returns {function(*, *, *): * }
 */
module.exports = (objRepo) => {
  const LocationModel = objRepo.LocationModel;
  return (req, res, next)=>{
      return LocationModel.find({}).then(locations => {
          res.locals.locations = locations;
          return next();
      }).catch(next);
  }
}