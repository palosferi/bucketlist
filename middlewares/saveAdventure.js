/**
 * menti az adventure-t a db-be
 * @param objRepo
 * @returns {function(*, *, *): * }
 */
module.exports = (objRepo) => {
    const AdventureModel = objRepo.AdventureModel;
    return (req, res, next)=>{
        const newAdventure = objRepo.AdventureModel();
        newAdventure.name = req.body.name;
        newAdventure.type = req.body.type;
        newAdventure.date = req.body.date;
        newAdventure.description = req.body.description;
        return newAdventure.save().then(() => {
            return res.redirect("/");
        }).catch(next);
    }
}