/**
 * Saves the location to the db
 * @param objRepo
 * @returns {function(*, *, *): * }
 */
module.exports = (objRepo) => {
  const LocationModel = objRepo.LocationModel;
  return (req, res, next) => {
      if (typeof req.body === 'undefined' ||
          typeof req.body.name === 'undefined' ||
          typeof req.body.country === 'undefined' ||
          typeof req.body.latitude === 'undefined' ||
          typeof req.body.longitude === 'undefined' ||
          typeof req.body.link === 'undefined'
      ) return next();

      let location = res.locals.location || new LocationModel();
      
      location.name      = req.body.name;
      location.country   = req.body.country;
      location.latitude  = parseInt(req.body.latitude, 10);
      location.longitude = parseInt(req.body.longitude, 10);
      location.link      = req.body.link;

      return location.save().then(() => {
          return res.redirect("/locations");
      }).catch(next);
  }
};