const Schema = require('mongoose').Schema;
const db = require('../config/db');

const Location = db.model('Location', {
  name: String,
  country: String,
  latitude: Number,
  longitude: Number,
  link: String
});

module.exports = Location;