const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bucketlist';

// Captured before anything is attached to the exported object: the module
// exports `mongoose` itself (models call db.model(...)), so adding a `connect`
// key here would otherwise shadow mongoose's own connect and recurse forever.
const mongooseConnect = mongoose.connect.bind(mongoose);

/**
 * Connects to MongoDB. Deliberately not fired on import: index.js awaits it
 * during boot, so a database that is down fails startup loudly instead of
 * surfacing as an unhandled rejection on the first request.
 */
function connectToDatabase() {
  return mongooseConnect(uri, { serverSelectionTimeoutMS: 10000 });
}

mongoose.connection.on('error', (err) => {
  console.error('[db] connection error:', err.message);
});
mongoose.connection.on('disconnected', () => {
  console.warn('[db] disconnected');
});

module.exports = mongoose;
module.exports.connectToDatabase = connectToDatabase;
module.exports.uri = uri;
