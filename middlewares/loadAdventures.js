/**
 * db bol az osszes adventure-t betolti
 * @param objRepo
 * @returns {function(*, *, *): * }
 */
module.exports = (objRepo) => {
    const AdventureModel = objRepo.AdventureModel;
    return (req, res, next)=>{
        return AdventureModel.find({})
        .populate('_location')
        .then(adventures => {
            res.locals.adventures = adventures;
            return next();
        }).catch(next);
    }
}