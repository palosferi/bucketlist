/**
 * db bol az osszes location-t betolti
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