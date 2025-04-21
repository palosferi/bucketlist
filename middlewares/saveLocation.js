/**
 * menti a location-t a db-be
 * @param objRepo
 * @returns {function(*, *, *): * }
 */
module.exports = (objRepo) => {
    const LocationModel = objRepo.LocationModel;
    return (req, res, next)=>{
        if(typeof req.body === 'undefined' || typeof req.body.name === 'undefined' || typeof req.body.country === 'undefined' || typeof req.body.latitude === 'undefined'
            || typeof req.body.longitude === 'undefined' || typeof req.body.link === 'undefined')
             return next();
        let newLocation = objRepo.LocationModel();
        if(typeof res.locals.location !== 'undefined') {
            newLocation = res.locals.location;
            newLocation.name = req.body.name;
            newLocation.country = req.body.country;
            newLocation.latitude = req.body.latitude;
            newLocation.longitude = req.body.longitude;
            newLocation.link = req.body.link;
        }
            return newLocation.save().then(() => {
            return res.redirect("/");
        }).catch(next);
    }
}