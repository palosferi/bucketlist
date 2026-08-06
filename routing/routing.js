
const loadAdventuresMW = require('../middlewares/adventures/loadAdventures');
const loadLocationsMW = require('../middlewares/locations/loadLocations');
const loadAdventureMW = require('../middlewares/adventures/loadAdventure');
const loadLocationMW = require('../middlewares/locations/loadLocation');
const saveAdventureMW = require('../middlewares/adventures/saveAdventure');
const saveLocationMW = require('../middlewares/locations/saveLocation');
const deleteAdventureMW = require('../middlewares/adventures/deleteAdventure');
const deleteLocationMW = require('../middlewares/locations/deleteLocation');
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
    app.use('/adventure/edit/:id', loadAdventureMW(objRepo), loadLocationsMW(objRepo), saveAdventureMW(objRepo), renderMW(objRepo, 'adventure'));
    app.use('/location/edit/:id', loadLocationMW(objRepo), saveLocationMW(objRepo), renderMW(objRepo, 'location'));
    app.use('/adventure/new', loadLocationsMW(objRepo), saveAdventureMW(objRepo), renderMW(objRepo, 'adventure'));
    app.use('/location/new', saveLocationMW(objRepo), renderMW(objRepo, 'location'));
    app.post('/adventure/delete/:id', loadAdventureMW(objRepo), deleteAdventureMW(objRepo));
    app.post('/location/delete/:id', loadLocationMW(objRepo), deleteLocationMW(objRepo));

    app.use((err, req, res, next) => {
        console.error("Error occurred:", err.stack || err);
        res.end("hiba");
    })
}

module.exports = subscribeToRoutes;