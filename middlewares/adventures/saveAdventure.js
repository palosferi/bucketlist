/**
 * Saves the adventure to the db
 * @param objRepo
 * @returns {function(*, *, *): * }
 */
module.exports = (objRepo) => {
    const AdventureModel = objRepo.AdventureModel;
    return (req, res, next) => {
        if (typeof req.body === 'undefined' ||
            typeof req.body.name === 'undefined' ||
            typeof req.body.type === 'undefined' ||
            typeof req.body.date === 'undefined' ||
            typeof req.body._location === 'undefined' ||
            typeof req.body.description === 'undefined'
        ) return next();

        let adventure = res.locals.adventure || new AdventureModel();
        
        adventure.name = req.body.name;
        adventure.type = req.body.type;
        adventure.date = req.body.date;
        adventure._location = req.body._location;
        adventure.description = req.body.description;

        return adventure.save().then(() => {
            return res.redirect("/adventures");
        }).catch(next);
    }
};
