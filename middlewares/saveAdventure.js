/**
 * menti az adventure-t a db-be
 * @param objRepo
 * @returns {function(*, *, *): * }
 */
module.exports = (objRepo) => {
    const AdventureModel = objRepo.AdventureModel;
    return (req, res, next)=>{
        if(typeof req.body.name === 'undefined' || typeof req.body.type === 'undefined' || typeof req.body.date === 'undefined'
           || typeof req.body.location === 'undefined' || typeof req.body.description === 'undefined')
            return next();
        let newAdventure = objRepo.AdventureModel();
        if(typeof res.locals.adventure !== 'undefined') 
            newAdventure = res.locals.adventure;
        newAdventure.name = req.body.name;
        newAdventure.type = req.body.type;
        newAdventure.date = req.body.date;
        newAdventure.description = req.body.description;
        return newAdventure.save().then(() => {
            return res.redirect("/");
        }).catch(next);
    }
}