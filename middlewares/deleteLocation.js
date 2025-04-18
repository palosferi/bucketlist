/**
 * torli a location-t a db-bol
 * @param objRepo
 * @returns {function(*, *, *): * }
 */
module.exports = (objRepo) => {
    return (req, res, next)=>{
        return res.locals.location.deleteOne().then(() => {
            return res.redirect("/");
        }).catch(next);
    }
}