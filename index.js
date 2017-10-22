const express = require('express'),
	config = require("config"),
	logger = require('./lib/logger');

const index = require('./routes/index');

const app = express();

let PORT = process.argv[2];
if(!PORT) {
	logger.error("No port specified on the command line, so using default port instead");
	PORT = config.get('server.defaults.port');
}

app.use('/', index);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


app.listen(PORT, () => {
	logger.info("Server up and running on port ", PORT);
});