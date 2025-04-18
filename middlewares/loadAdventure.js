/**
 * db bol 1 adventure-t betolt
 * @param objRepo
 * @returns {function(*, *, *): * }
 */
module.exports = (objRepo) => {
    return (req, res, next)=>{
        res.locals.adventure = objRepo.ADVENTUREDB.find(e=>e._id === req.params.id);
        if(typeof res.locals.adventure === 'undefined') {
            return res.redirect("/");
        }
        return next();
    }
}