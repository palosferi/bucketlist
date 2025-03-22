
const loadAdventuresMW = require('../middlewares/loadAdventures');
const loadLocationsMW = require('../middlewares/loadLocations');
const loadAdventureMW = require('../middlewares/loadAdventure');
const loadLocationMW = require('../middlewares/loadLocation');
const saveAdventureMW = require('../middlewares/saveAdventure');
const saveLocationMW = require('../middlewares/saveLocation');
const deleteAdventureMW = require('../middlewares/deleteAdventure');
const deleteLocationMW = require('../middlewares/deleteLocation');
const renderMW = require('../middlewares/render');

function subscribeToRoutes(app) {
    const objRepo = {};
    app.get('/', loadAdventuresMW(objRepo), renderMW(objRepo))
    app.get('/locations', loadLocationsMW(objRepo), renderMW(objRepo))
    app.get('/adventure/edit/:id', loadAdventureMW(objRepo), renderMW(objRepo))
    app.get('/location/edit/:id', loadLocationMW(objRepo), renderMW(objRepo))
    app.get('/adventure/new', saveAdventureMW(objRepo), renderMW(objRepo))
    app.get('/location/new', saveLocationMW(objRepo), renderMW(objRepo))
    app.get('/adventure/delete/:id', deleteAdventureMW(objRepo), renderMW(objRepo))
    app.get('/location/delete/:id', deleteLocationMW(objRepo), renderMW(objRepo))
}

module.exports = subscribeToRoutes;