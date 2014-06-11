#!/usr/bin/env node
/*jslint node: true */
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

hbs.registerHelper('format_MMMMDYYYY', function(date) {
  return moment(date).format('MMMM DD, YYYY');
});

hbs.registerHelper('format_hmma', function(date) {
  return moment(date).format('h:mm a');
});

hbs.registerHelper('from_now', function(date) {
  return moment(date).fromNow();
});


app.post('/sensor/:name', function(req, res) {
  var name = req.params.name;
  console.log('Received signal from room: %s', name);
  Room.fromId(name, function(err, room) {
    room.times.push(new Date());
    room.save(function(err) {
      if (err) {
        return res.end('room.save error: ' + err.toString());
      }
      res.end('success. ' + room.times.length + ' times logged.');
    });
  });
});

app.get('/', function(req, res) {
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
      var times = (room.times || []).filter(function(time) {
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
        last: Math.max.apply(null, room.times),
        times: times,
      };
    });

    rooms.sort(function(a, b) {
      return a.last - b.last;
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

function rnorm() {
  // from http://stackoverflow.com/questions/15279271/bias-in-randomizing-normally-distributed-numbers-javascript
  var x = 0, y = 0, rds, c;

  // Get two random numbers from -1 to 1.
  // If the radius is zero or greater than 1, throw them out and pick two new ones
  // Rejection sampling throws away about 20% of the pairs.
  do {
    x = Math.random()*2-1;
    y = Math.random()*2-1;
    rds = x*x + y*y;
  } while (rds === 0 || rds > 1);

  // This magic is the Box-Muller Transform
  c = Math.sqrt(-2 * Math.log(rds) / rds);

  // It always creates a pair of numbers. I'll return them in an array.
  // This function is quite efficient so don't be afraid to throw one away if you don't need both.
  // return [x*c, y*c];
  return x*c;
}

app.get('/populate/:name', function(req, res) {
  var name = req.params.name;
  var now = new Date();
  console.log('Populating room with random times: %s', name);
  Room.fromId(name, function(err, room) {
    for (var i = 0; i < 5; i++) {
      // pick 5 events sometime in the last three hours
      var event = new Date() - (2*60*60*1000 * Math.random());
      // console.log('event', new Date(event));
      // var date = new Date(now - (minutes_since_event + minutes_around_event - offset) * 60 * 1000);
      // var offset = 90;
      // var minutes_since_event = (rnorm() * 45);
      for (var j = 0; j < 10; j++) {
        // pick 10 times somewhere 15 minutes before that.
        var signal = new Date(event - (15*60*1000 * Math.random()));
        // var minutes_around_event = (rnorm() * 15);
        // console.log('signal', signal);
        room.times.push(signal);
      }
    }

    console.log('Saving room: %s', name);
    room.save(function(err) {
      res.end('Done. Room has logged ' + room.times.length + ' times.');
    });
  });
});

app.get('/empty/:name', function(req, res) {
  var name = req.params.name;
  Room.fromId(name, function(err, room) {
    room.times = [];
    room.save(function(err) {
      res.end('Done. Room has logged ' + room.times.length + ' times.');
    });
  });
});

app.get('/original', function(req, res) {
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
