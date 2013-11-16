'use strict'; /*jslint es5: true, node: true, indent: 2 */
var mongoose = require('mongoose');

// mongodb initialization
mongoose.connect('localhost', 'hacktx');
var room_schema = new mongoose.Schema({
  _id: String,
  description: String,
  times: [Date]
});
var Room = exports.Room = mongoose.model('Room', room_schema);
