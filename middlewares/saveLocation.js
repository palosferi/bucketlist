/**
 * menti a location-t a db-be
 * @param objRepo
 * @returns {function(*, *, *): * }
 */
module.exports = (objRepo) => {
    return (req, res, next)=>{
        const newLocation = objRepo.LocationModel();
        newLocation.name = req.body.name;
        newLocation.country = req.body.country;
        newLocation.latitude = req.body.latitude;
        newLocation.longitude = req.body.longitude;
        newLocation.link = req.body.link;
        return newLocation.save().then(() => {
            return res.redirect("/");
        }).catch(next);
    }
}