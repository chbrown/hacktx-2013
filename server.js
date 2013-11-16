'use strict'; /*jslint es5: true, node: true, indent: 2 */
var express = require('express');
var hbs = require('hbs');

var mongoose = require('mongoose');
var Article = mongoose.model('Article');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.engine('html', hbs.__express);

app.post('/sensor/:name', function(req, res) {
  var entry = blogEngine.getBlogEntry(req.params.id);


  res.render('article', {title:entry.title, blog:entry});
  res.write('success');
  res.end();
});

// app.get('/about', function(req, res) {
//   res.render('about');
// });

// app.get('/article', function(req, res) {
//   res.render('article');
// });


app.configure(function(){
  // app.set('port', );
  app.use(express.bodyParser());
  app.use(express.static(path.join(__dirname, 'public')));
});


var express = require('express');
var app = express();

app.listen(process.env.PORT || 8070);

// http.createServer(app).listen(app.get('port'), function(){
//   console.log(“RabbitMQ + Node.js app running on AppFog!”);
// });
