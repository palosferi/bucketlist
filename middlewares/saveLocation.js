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
            typeof req.body.country === 'undefined' ||
            typeof req.body.latitude === 'undefined' ||
            typeof req.body.longitude === 'undefined' ||
            typeof req.body.link === 'undefined'
        ) return next();

        let location = res.locals.location || new LocationModel();

        location.name = req.body.name;
        location.country = req.body.country;
        location.latitude = parseFloat(req.body.latitude);
        location.longitude = parseFloat(req.body.longitude);
        location.link = req.body.link;

        return location.save().then(() => {
            return res.redirect("/locations");
        }).catch(next);
    }
};
