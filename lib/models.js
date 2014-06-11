/*jslint node: true */
var mongoose = require('mongoose');

// mongodb initialization
mongoose.connect('localhost', 'hacktx');
var room_schema = new mongoose.Schema({
  _id: String,
  description: String,
  times: [Date]
});
room_schema.statics.fromId = function(id, callback) {
  /** User.findOrCreateById but better */
  var Room = this;
  this.findById(id, function(err, user) {
    if (err) return callback(err);

    if (user) {
      callback(null, user);
    }
    else {
      console.error('Creating new Room(%s)', id);
      new Room({_id: id}).save(function(err, user) {
        callback(err, user);
      });
    }
  });
};

var Room = exports.Room = mongoose.model('Room', room_schema);
