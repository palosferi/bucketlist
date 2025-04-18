const Schema = require('mongoose').Schema;
const db = require('../config/db');

const Adventure = db.model('Adventure', {
  name: String,
  type: String,
  date: String,
  _location: {
    type: Schema.Types.ObjectId,
    ref: 'Location'
  },
  description: String,
});

module.exports = Adventure;