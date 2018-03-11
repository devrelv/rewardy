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

// Register your web app routes here
app.get('/', function (req, res, next) {
  res.render('index', { title: 'Reward app' });
});

// Register Bot
var bot = require('./bot');

app.use(bodyParser.urlencoded({ extended: true }));

// Viber connector (not using bodyParser.json)
var viber = require('botbuilder-viber');

const viberOptions = {
  Token: process.env.VIBER_TOKEN,
  Name: process.env.BOT_NAME,
  AvatarUrl: process.env.BOT_AVATAR
};
var viberChannel = new viber.ViberEnabledConnector(viberOptions);
bot.connect(viber.ViberChannelId, viberChannel);
app.use('/viber/webhook', viberChannel.listen());

// ----JSON enabled connectors from here on ----
app.use(bodyParser.json()); // Only the next lines should be on json

app.post('/api/messages', bot.listen());

// Example : http://localhost:3978/proactive?message_id=5&message_data={"message":"Hey!%3Cbr%2F%3EThis%20is%20Emma%20from%20Rewardy."}&user_id=test
app.get('/proactive', (req,res) => {
  var messageId = req.query.message_id;
  var messageData = req.query.message_data;
  var userId = req.query.user_id;
  bot.send_proactive_message(userId, messageId, messageData);
  res.send('Done');
});

app.get('/broadcast_all_users', (req,res) => {
  var key = req.query.key;
  var message = req.query.message;
  if (key != '1234') {
    res.send('Wrong Key');
  } else {
    bot.broadcastAllUsers(message).then(updatedUsersCount=> {
      res.send('Done: ' + updatedUsersCount + ' users updated');
    }).catch(err=>{
      res.json(err);
    });    
  }
});


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