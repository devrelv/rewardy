// This loads the environment variables from the .env file
require('dotenv-extended').load();
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');

// Web app
var app = express();
var bodyParser = require('body-parser');


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.static(path.join(__dirname, 'public')));


// Error handlers

// Development error handler, will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}


// Viber initialization
var viber = require('botbuilder-viber');

const viberOptions = {
  Token: process.env.VIBER_TOKEN,
  Name: process.env.BOT_NAME,
  AvatarUrl: process.env.BOT_AVATAR
};


// Register your web app routes here
app.get('/', function (req, res, next) {
  res.render('index', { title: 'Reward app' });
});


// Register Bot
var bot = require('./bot');

app.use(bodyParser.urlencoded({ extended: true }));

// var viberChannel = new viber.ViberEnabledConnector(viberOptions);
// bot.connect(viber.ViberChannelId, viberChannel);

// app.use('/viber/webhook', viberChannel.listen());

app.use(bodyParser.json()); // Only the next lines should be on json

app.post('/viber/webhook', function (req, res) {
  console.log(req);
  res.writeHead(200);
  res.end();
});

app.post('/api/messages', bot.listen());


// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Production error handler, no stacktraces leaked to user
app.use(function (err, req, res, next) {
  console.log('say what = ', err);
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

// Start listening
var port = process.env.port || process.env.PORT || 3978;
app.listen(port, function () {
  console.log('Web Server listening on port %s', port);
});