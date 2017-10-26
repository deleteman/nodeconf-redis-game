const Redis = require("redis"),
	config = require("config"),
	async = require("async"),
	rs = require("random-string");


class ServerNode {

	constructor(logger) {
		this.logger = logger;
		this.hits = {};
	}

	init(done) {
		this.logger.info("Server 100% Node started!");
		done();
	}

	
	/*
	Returns the local copy of the ranking
	*/
	getRanking() {
	    return Object.values(this.hits).sort((a,b) => { return b.points - a.points; }).slice(0, 10); // this takes > 95% of processing time
	}

	
	receiveHit(hit, done) {
		this.logger.info("Hit received from user " + hit.username)
		if(this.hits[hit.username]) {
			this.hits[hit.username].points++;
		} else {
			this.hits[hit.username] = {username: hit.username, points: 1};
		}
		done();
	}
}

module.exports = ServerNode;