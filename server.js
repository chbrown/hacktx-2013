'use strict'; /*jslint es5: true, node: true, indent: 2 */
var express = require('express');
var moment = require('moment');
var mongoose = require('mongoose');

// mongodb initialization
mongoose.connect('localhost', 'hacktx');
var room_schema = new mongoose.Schema({
  _id: String,
  description: String,
  times: [Date]
});
var Room = mongoose.model('Room', room_schema);

var app = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'hbs');
// app.set('view engine', 'html');
// var hbs = require('hbs');
// app.engine('html', hbs.__express);

app.post('/sensor/:name', function(req, res) {
  console.log('Looking for room: %s', req.params.name);
  Room.findById(req.params.name, function(err, room) {
    if (err || room === null) {
      console.error('Creating new Room: %s', room);
      room = new Room({_id: req.params.name});
    }

    room.times.push(new Date());
    room.save(function(err) {
      if (err) {
        return res.end('room.save error: ' + err.toString());
      }
      res.end('success. ' + room.times.length + ' times stored.');
    });
  });
});

app.get('/', function(req, res) {
  var one_hour_ago = (new Date().getTime()) * 60*60*1000;
  Room.find(function(err, rooms) {
    rooms = rooms.map(function(room) {
      var recent_blocks = room.times.filter(function(time) {
        return time >= one_hour_ago;
      }).map(function(time) {
        return time.toString();
      });
      return {
        name: room.name,
        description: room.description,
        blocks: recent_blocks,
      };
    });
    res.render('rooms', rooms);
  });
});

app.listen(8070, function() {
  console.log('Listening on :8070');
});
