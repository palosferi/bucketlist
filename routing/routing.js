
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
    app.get('/', (req, res) => res.redirect('/adventures'));
    app.get('/adventures', loadAdventuresMW(objRepo), renderMW(objRepo, 'adventures'));
    app.get('/locations', loadLocationsMW(objRepo), renderMW(objRepo, 'locations'));
    app.get('/adventure/edit/:id', loadAdventureMW(objRepo), loadLocationsMW(objRepo), renderMW(objRepo, 'adventure'));
    app.post('/adventure/edit/:id', loadAdventureMW(objRepo), loadLocationsMW(objRepo), saveAdventureMW(objRepo));
    app.get('/location/edit/:id', loadLocationMW(objRepo), renderMW(objRepo, 'location'));
    app.post('/location/edit/:id', loadLocationMW(objRepo), saveLocationMW(objRepo));
    app.get('/adventure/new', loadLocationsMW(objRepo), renderMW(objRepo, 'adventure'));
    app.post('/adventure/new', loadLocationsMW(objRepo), saveAdventureMW(objRepo));
    app.get('/location/new', renderMW(objRepo, 'location'));
    app.post('/location/new', saveLocationMW(objRepo));
    app.post('/adventure/delete/:id', deleteAdventureMW(objRepo));
    app.post('/location/delete/:id', deleteLocationMW(objRepo));

    app.use((err, req, res, next) => {
        console.error("Error occurred:", err.stack || err);
        res.end("hiba");
    })
}

module.exports = subscribeToRoutes;