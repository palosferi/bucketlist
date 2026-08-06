const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/bucketlist');
module.exports = mongoose;