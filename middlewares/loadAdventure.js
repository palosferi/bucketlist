/**
 * db bol 1 adventure-t betolt
 * @param objRepo
 * @returns {function(*, *, *): * }
 */
module.exports = (objRepo) => {
    const AdventureModel = objRepo.AdventureModel;
    return (req, res, next)=>{
        return AdventureModel.findOne({
            _id: req.params.id
        }).then(adventure => {
            if(torpe === null)
                return res.redirect("/");
            res.locals.adventure = adventure;
            return next();
        }).catch(next);
    }
}