/**
 * torli az adventure-t a db-bol
 * @param objRepo
 * @returns {function(*, *, *): * }
 */
module.exports = (objRepo) => {
    return (req, res, next)=>{
        if (!res.locals.adventure._id) {
            return res.redirect("/adventures");
        }
        return res.locals.adventure.deleteOne().then(() => {
            return res.redirect("/adventures");
        }).catch(next);
    }
}