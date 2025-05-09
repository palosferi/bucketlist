/**
 * menti a location-t a db-be
 * @param objRepo
 * @returns {function(*, *, *): * }
 */
module.exports = (objRepo) => {
  const LocationModel = objRepo.LocationModel;
  return (req, res, next) => {
      if (typeof req.body === 'undefined' ||
          typeof req.body.name === 'undefined' ||
          typeof req.body.type === 'undefined' ||
          typeof req.body.date === 'undefined' ||
          typeof req.body._location === 'undefined' ||
          typeof req.body.description === 'undefined'
      ) return res.redirect("/locations");

      let location = res.locals.location || new LocationModel();
      
      location.name      = req.body.name;
      location.country   = req.body.country.trim();
      location.latitude  = req.body.latitude;
      location.longitude = req.body.longitude;
      location.link      = req.body.link;

      return location.save().then(() => {
          return res.redirect("/locations");
      }).catch(next);
  }
};