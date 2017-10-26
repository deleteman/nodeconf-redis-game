const express = require('express'),
 	  router = express.Router();


let Server = null;
let LOGGER = null;

router.post('/', function(req, res, next) {
	LOGGER.info("POST RECEIVED FROM USER: " + req.body.username);
	Server.receiveHit(req.body, (err) => {
		if(err) return next(err);
		res.json({ result: 'OK'});
	});
});

router.get('/ranking', function(req, res, next) {
	LOGGER.info("GETTING RANKING");
		res.json(Server.localRanking);
})
module.exports = (logger, server) => {
	Server = server;
	LOGGER = logger;
	return router;
};
