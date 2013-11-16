'use strict'; /*jslint es5: true, node: true, indent: 2 */
var express = require('express');
var moment = require('moment');
var winston = require('winston');
var hbs = require('hbs');

var Room = require('./lib/models').Room;
var logger = new winston.Logger();

var app = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.engine('html', hbs.__express);

hbs.registerHelper('time', function(date) {
  return moment(date).format('h:mm a');
});


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
      res.end('success. ' + room.times.length + ' times logged.');
    });
  });
});

app.get('/smooth', function(req, res) {
  var two_hours_ago = moment().subtract(moment.duration(2, 'hours'));
  Room.find(function(err, rooms) {
    rooms = rooms.map(function(room) {
      var recent_times = room.times.filter(function(time) {
        return time > two_hours_ago;
      });
      return {name: room.name, description: room.description, times: recent_times};
    });
    var context = {rooms: rooms, two_hours_ago: two_hours_ago, now: new Date()};
    res.render('smooth', context);
  });
});

app.get('/', function(req, res) {
  var current_time = new Date().getTime() / 1000,
      one_hour_ago = current_time - 60 * 60,
      num_blocks = 12,
      minute_increments = 5,
      recent_time = Math.floor(current_time / 300) * 300,
      first_time = recent_time - num_blocks * minute_increments * 60,
      timeblocks = [],
      counter = 0;

  for (var i = first_time; i < recent_time; i += minute_increments * 60) {
    timeblocks.push({time: i, status: "vacant"});
    console.log("ini: " + moment.unix(i).format('h:mm a'));
  }

  Room.find(function(err, rooms) {
    rooms = rooms.map(function(room) {
      var recent_blocks = room.times.filter(function(time) {
        return (time.getTime() / 1000) >= first_time;
      }).map(function(time) {
        time = Math.floor(time.getTime() / 1000);
        console.log("time: " + moment.unix(time).format('h:mm a'));
        while (time >= timeblocks[counter]['time']) {
          counter++;
        }
        if (time <= timeblocks[counter + 1]['time']) {
          console.log("OCCUPIED AT: " + moment.unix(timeblocks[counter]['time']).format('h:mm a'));
          timeblocks[counter]['status'] = "occupied";
        }
      });
      console.log(timeblocks);
      return {
        name: room.name,
        description: room.description,
        blocks: timeblocks
      };
    });
    res.render('rooms', rooms);
  });
});

app.listen(8070, function() {
  console.log('Listening on :8070');
});
