
const loadAdventuresMW = require('../middlewares/loadAdventures');
const loadLocationsMW = require('../middlewares/loadLocations');
const loadAdventureMW = require('../middlewares/loadAdventure');
const loadLocationMW = require('../middlewares/loadLocation');
const saveAdventureMW = require('../middlewares/saveAdventure');
const saveLocationMW = require('../middlewares/saveLocation');
const deleteAdventureMW = require('../middlewares/deleteAdventure');
const deleteLocationMW = require('../middlewares/deleteLocation');
const renderMW = require('../middlewares/render');

const AdventureModel = require('../models/adventure');

function subscribeToRoutes(app) {
    const objRepo = {AdventureModel : AdventureModel};
    app.get('/', loadAdventuresMW(objRepo), renderMW(objRepo, 'adventures'));
    app.get('/locations', loadLocationsMW(objRepo), renderMW(objRepo, 'locations'));
    app.get('/adventure/edit/:id', loadAdventureMW(objRepo), renderMW(objRepo, 'adventure'));
    app.get('/location/edit/:id', loadLocationMW(objRepo), renderMW(objRepo, 'location'));
    app.get('/adventure/new', saveAdventureMW(objRepo), renderMW(objRepo, 'adventure'));
    app.get('/location/new', saveLocationMW(objRepo), renderMW(objRepo, 'location'));
    app.get('/adventure/delete/:id', deleteAdventureMW(objRepo), renderMW(objRepo, 'adventure'));
    app.get('/location/delete/:id', deleteLocationMW(objRepo), renderMW(objRepo, 'location'));

    app.use((err, req, res, next) => {
        console.log(err);
        res.end("hiba");
    })
}

module.exports = subscribeToRoutes;