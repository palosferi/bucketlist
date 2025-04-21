
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
const LocationModel = require('../models/location');

function subscribeToRoutes(app) {
    const objRepo = {
        AdventureModel : AdventureModel,
        LocationModel: LocationModel
    };
    app.get('/', loadAdventuresMW(objRepo), renderMW(objRepo, 'adventures'));
    app.get('/locations', loadLocationsMW(objRepo), renderMW(objRepo, 'locations'));
    app.use('/adventure/edit/:id', loadAdventureMW(objRepo), saveAdventureMW(objRepo), renderMW(objRepo, 'adventure'));
    app.use('/location/edit/:id', loadLocationMW(objRepo), saveLocationMW(objRepo), renderMW(objRepo, 'location'));
    app.use('/adventure/new', saveAdventureMW(objRepo), renderMW(objRepo, 'adventure'));
    app.use('/location/new', saveLocationMW(objRepo), renderMW(objRepo, 'location'));
    app.use('/adventure/delete/:id', loadAdventureMW(objRepo), deleteAdventureMW(objRepo), renderMW(objRepo, 'adventure'));
    app.use('/location/delete/:id', loadLocationMW(objRepo), deleteLocationMW(objRepo), renderMW(objRepo, 'location'));

    app.use((err, req, res, next) => {
        console.error("Error occurred:", err.stack || err);
        res.end("hiba");
    })
}

module.exports = subscribeToRoutes;