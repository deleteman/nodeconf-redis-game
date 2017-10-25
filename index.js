const express = require('express'),
	config = require("config"),
	gameServer = require("./lib/server"),
	bodyParser = require('body-parser')
	logger = require('./lib/logger');


const app = express();

const Server = new gameServer(logger);


Server.connect(() => {
	logger.info("Game server online and connected!")
});

const index = require('./routes/index')(logger, Server);

let PORT = process.argv[2];

if(!PORT) {
	logger.error("No port specified on the command line, so using default port instead");
	PORT = config.get('server.defaults.port');
}

app.use(bodyParser.json());

app.use('/', index);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // render the error page
  res.status(err.status || 500);
  res.json(err);

});

app.listen(PORT, () => {
	logger.info("Server up and running on port ", PORT);
});