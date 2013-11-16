'use strict'; /*jslint es5: true, node: true, indent: 2 */
var express = require('express');
var async = require('async');
var eyes = require('eyes');
var moment = require('moment');
var winston = require('winston');
var hbs = require('hbs');

var Room = require('./lib/models').Room;
var logger = new winston.Logger({level: 'debug'});

var app = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.engine('html', hbs.__express);

hbs.registerHelper('format_hmma', function(date) {
  return moment(date).format('h:mm a');
});

hbs.registerHelper('from_now', function(date) {
  return moment(date).fromNow();
});


app.post('/sensor/:name', function(req, res) {
  // console.log('Looking for room: %s', req.params.name);
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
  // span is the raw duration (milliseconds) between now and two hours ago
  var span = moment().diff(two_hours_ago);

  var slot_length = moment.duration(15, 'minutes');

  var slots = [];
  var quarter = moment().get('minutes') / 15 | 0;
  var cursor = moment().set('minutes', quarter * 15).set('seconds', 0);
  while (cursor > two_hours_ago) {
    var time = cursor.clone();
    slots.unshift({
      time: time.toDate(),
      offset: 100 * moment().diff(time) / span,
    });
    cursor.subtract(slot_length);
  }

  Room.find(function(err, rooms) {
    rooms = rooms.map(function(room) {
      var times = room.times.filter(function(time) {
        return time > two_hours_ago;
      }).map(function(time) {
        return {
          time: time,
          offset: 100 * moment().diff(time) / span,
        };
      });
      return {
        name: room._id,
        description: room.description,
        last: room.times[room.times.length - 1],
        times: times,
      };
    });
    var context = {
      rooms: rooms,
      slots: slots,
      // two_hours_ago: two_hours_ago,
      now: new Date(),
    };
    // eyes.inspect(context, 'smooth context');
    res.render('smooth', context);
  });
});

app.get('/populate', function(req, res) {
  //
  Room.find(function(err, rooms) {
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
