var HTTPS = require('https');
var Promise = require('promise');

var cached = require('./cached');

var all = require('./commands/all');
var bye = require('./commands/bye');
var flip = require('./commands/flip');
var insult = require('./commands/insult');
var ping = require('./commands/ping');
var pins = require('./commands/pins');
var roll = require('./commands/roll');

var botId = process.env.BOT_ID;


var commands = [all, bye, flip, insult, ping, pins, roll];

/**
 * Extracts request message and responds if necessary.
 */
function respond() {
  var request = JSON.parse(this.req.chunks[0]);
  message = request.text;
  if (message.charAt(0) == '!') {
    response = run(request);
    send(response, this);
  }
}

/**
 * Processes a message and returns a json response object.
 * @return {Promise<Object>} promise containing response object
 * @private
 */
function run(request) {
  var message = request.text;
  var response = null;
  for (var i = 0; i < commands.length; i++) {
    command = commands[i];
    if (message.match(command.matcher) != null) {
      response = command.run(message, request);
    }
  }
  return Promise.resolve(response);
}

/**
 * Send request to GroupMe API to post message on bot's behalf
 * @private
 */
function send(responsePromise, responder) {
  console.log(responsePromise);
  responsePromise.then(function(response) {
    console.log('about to send message to groupme: ' + JSON.stringify(response));
    sendHttpRequest(response, responder);
  }, function(error) {
    response = {
      'text': 'There was an error processing the request: ' +
          JSON.stringify(error)
    }
  });
}

function sendHttpRequest(response, responder) {
  responder.res.writeHead(200);

  response['bot_id'] = botId;

  var options = {
    hostname: 'api.groupme.com',
    path: '/v3/bots/post',
    method: 'POST'
  };

  var req = HTTPS.request(options, function(res) {
    if (res.statusCode != 202) {
      console.log('rejecting bad status code ' + res.statusCode);
      console.log(res);
    }
  });

  req.on('error', function(err) {
    console.log('error posting message '  + JSON.stringify(err));
  });
  req.on('timeout', function(err) {
    console.log('timeout posting message '  + JSON.stringify(err));
  });

  req.end(JSON.stringify(response));

  responder.res.end();
}

exports.respond = respond;
