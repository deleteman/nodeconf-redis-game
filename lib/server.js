const Redis = require("redis"),
	config = require("config"),
	async = require("async"),
	rs = require("random-string");


class Server {

	constructor(logger) {
		this.logger = logger;
		this.redisClient = null,
		this.redisSubs = null;
		this.localRanking = [];
		this.id = rs(); //generate a random ID for the server
		this.activeKeyName = this.id + "_active";
	}

	/* 
	Connect both clients to the redis server
	*/
	init(done) {
		this.redisClient = Redis.createClient();
		this.redisSubs	 = Redis.createClient();

		this.redisSubs.on('connect', () => {
			this.addToActiveList(done);
		});
	}

	/*
	Resets the timeout of the activity key for this particular server
	*/
	resetTimeout(done) {
		this.redisClient.set(this.activeKeyName, this.id, "EX", config.get('server.defaults.defaultTimeout'),done);
	}

	/*
	Create the activity key on Redis to sigal this server as active.
	Also, subscribe for ranking update messages
	*/
	addToActiveList(done) {
		this.resetTimeout((err) => {
			if(err) return done(err);

			this.redisSubs.on("message", (channel, msg) => {
				if(channel == "ranking-updates") {
					this.logger.info("Updating local ranking!");
					this.redisClient.zrevrange('ranking', 0, 10, 'withscores', (err, ranking) => {
						this.localRanking = [];
						for(let i = 0; i < ranking.length - 1; i += 2) {
							this.localRanking.push({username: ranking[i], points: ranking[i+1]})
						}
					})
				}
			})

			this.redisSubs.on('subscribe', (channel, count) => {
				this.logger.debug("Subscriber client ready: ", channel, count)
			})

			this.redisSubs.subscribe("ranking-updates");
			done();
		});
		
	}

	/*
	Returns the local copy of the ranking
	*/
	getRanking() {
		return this.localRanking;
	}

	/*
	Receive and record on Redis a user hit
	*/
	recordUserHit(hit, done) {
		let key = this.id + "_" + hit.username;
		this.redisClient.set(key, 1, "EX", config.get('userHits.defaultTTL'), done);
	}

	/*
	Returns the list of ids from active servers
	*/
	getActiveServers(done) {
		//gets the list of active servers
		this.redisClient.keys("*_active", (err, keys) => {

			if(err) return done(err);
			done(null, keys.map(k => k.split("_")[0]));
		});
	}

	/*
	Returns the list of servers hit by the user at the moment
	*/
	getServersHit(username, done) {
		this.redisClient.keys("*_" + username, (err, keys) => {
			if(err) return done(err);
			done(null, keys.map(k => k.split("_")[0]));
		});
	}

	/*
	1- Record the hit from the user
	2- Verify all other servers have already been hit
	3- If so:
		3.1 - lock the user to keep other requests from adding points
		3.2 - add a point to the user 
		3.3 - notify servers to update their rankings
	4- If not, do nothing
	*/
	receiveHit(hit, done) {
		this.resetTimeout((err) => {
			if(err) return done(err);

			let allServersHit = true;

			this.logger.debug("Server(" + this.id + "):: Hit received!");

			this.recordUserHit(hit, (err) => {
				if(err) return done(err);
				this.getActiveServers((err, listActiveServers) => {
					if(err) return done(err)
					this.getServersHit(hit.username, (err, hitServers) => {
						if(err) return done(err)

						allServersHit = listActiveServers.sort().join() === hitServers.sort().join();

						this.logger.debug("Server(" + this.id + "):: " + hitServers.length + " servers hit by user " + hit.username + " out of " + listActiveServers.length);
						if(allServersHit) {
							//locks the user from voting for the next second
							return this.redisClient.set(hit.username, 1, "NX", "EX", config.get('userHits.defaultLockTTL'), (err, val) => {
								if(err) return done(err);
								if(val === 'OK') { //if it's the vote that locks the user, then process it...
									this.logger.debug("Server("+this.id+"):: all servers have been hit by " + hit.username + "!");
									return this.redisClient.zincrby('ranking', 1, hit.username, (err, val) => {
											if(err) return done(err);
											this.logger.info("Adding 1 to " + hit.username)
											this.redisClient.publish('ranking-updates', 1, done)										
										});
								} else { //otherwise, it's locked!
									this.logger.info("Server ("+this.id+"):: " + hit.username + " hits still valid, can't add 1 yet!")
								}
							})
						}
						done();	
					})
				})
			}) 
		});

	}
}

module.exports = Server;