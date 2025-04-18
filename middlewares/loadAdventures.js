/**
 * db bol az osszes adventure-t betolti
 * @param objRepo
 * @returns {function(*, *, *): * }
 */
module.exports = (objRepo) => {
    return (req, res, next)=>{
        return objRepo.adventureModel.find({}, (torpek)=>{
            res.locals.adventures = adventures;
            return next();
        })
    }
}