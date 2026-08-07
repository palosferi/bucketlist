/**
 * Loads a single location from the db
 * @param objRepo
 * @returns {function(*, *, *): * }
 */
module.exports = (objRepo) => {
  const LocationModel = objRepo.LocationModel;
  return (req, res, next)=>{
      return LocationModel.findOne({
          _id: req.params.id
      }).then(location => {
          if(location === null)
              return res.redirect("/locations");
          res.locals.location = location;
          return next();
      }).catch(next);
  }
}