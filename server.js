'use strict'; /*jslint es5: true, node: true, indent: 2 */
var express = require('express');
var mongoose = require('mongoose');

// mongodb initialization
mongoose.connect('localhost');
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
  Room.findByIdAndUpdate(req.params.name, {$push: {times: new Date()}}, {upsert: true}, function(err) {
    if (err) {
      console.error(err.stack);
      res.end('Error: ' + err);
    }

    res.write('success');
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

app.listen(8070);
