/**
 * Deletes the location from the db
 * @param objRepo
 * @returns {function(*, *, *): * }
 */
module.exports = (objRepo) => {
    return (req, res, next)=>{
        return res.locals.location.deleteOne().then(() => {
            return res.redirect("/locations");
        }).catch(next);
    }
}