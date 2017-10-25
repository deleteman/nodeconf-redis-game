const Redis = require("redis"),
	config = require("config"),
	rs = require("random-string");


class Server {

	constructor(logger) {
		this.logger = logger;
		this.redisClient = null,
		this.redisSubs = null;
		this.localRanking = {};
		this.id = rs();
		this.activeKeyName = this.id + "_active";
	}

	connect(done) {
		this.redisClient = Redis.createClient();
		this.redisSubs	 = Redis.createClient();

		this.redisClient.on('connect', () => {
			this.addToActiveList();
			
			done();
		});
	}

	resetTimeout() {
		this.redisClient.set(this.activeKeyName, this.id);
		this.redisClient.expire(this.activeKeyName, config.get('server.defaults.defaultTimeout'));
	}

	addToActiveList() {
		this.resetTimeout();

		this.redisSubs.on("message", (channel, msg) => {
			this.logger.info("Updating local ranking!");
			if(channel == "ranking-updates") {
				this.redisClient.zrevrange('ranking', 0, -1, 'withscores', (err, ranking) => {
					this.localRanking = ranking;
				})
			}
		})

		this.redisSubs.subscribe("ranking-updates");
		
	}

	getRanking() {
		return this.localRanking;
	}

	recordUserHit(hit, done) {
		let key = this.id + "_" + hit.username;
		this.redisClient.set(key, 1, err => {
			if(err) return done(err);
			this.redisClient.expire(key, config.get('server.defaults.defaultTimeout'), done)
		});
	}

	getActiveServers(done) {
		//gets the list of active servers
		this.redisClient.keys("*_active", (err, keys) => {

			if(err) return done(err);
			done(null, keys.map(k => k.split("_")[0]));
		});
	}

	getServersHit(username, done) {
		this.redisClient.keys("*_" + username, (err, keys) => {
			if(err) return done(err);
			done(null, keys.map(k => k.split("_")[0]));
		});
	}
	/*
	1- Record the hit from the user
	2- Verify all other servers have already been hit
	3- If so, add a point to the user and notify servers to update their rankings
	4- If not, do nothing
	*/
	receiveHit(hit, done) {
		this.resetTimeout();

		let listActiveServers,
			hitServers,
			allServersHit = true;

		this.logger.debug("Server:: Hit received!");

		this.recordUserHit(hit, (err) => {
			if(err) return done(err);
			this.getActiveServers((err, listActiveServers) => {
				this.getServersHit(hit.username, (err, hitServers) => {
					if(err) return done(err)

					allServersHit = listActiveServers.sort().join() === hitServers.sort().join();
				
					this.logger.debug("Server:: " + hitServers.length + " servers hit by user " + hit.username + " out of " + listActiveServers.length);
					if(allServersHit) {
						this.logger.debug("Server:: all servers have been hit!");
						return this.redisClient.zincrby('ranking', 1, hit.username, (err) => {
							if(err) return done(err);

							this.redisClient.publish('ranking-updates', 1)	
							done();
						});
					}
					done();	
				})
			})
		}) 

	}
}

module.exports = Server;