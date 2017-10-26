const request = require("request"),
	rs = require("random-string"),
	shuffle = require("../lib/shuffle"),
	async = require("async");

const usernames = ["fernando", "deleteman", "andres", "juan", "carlos"];

//const ports = [9090, 9091, 9092];
const ports = [9090];
const totalRequests = 100;


setInterval(() => {
	async.map(shuffle(usernames).slice(0,1), (usr, next) => {
		async.times(totalRequests, (n, done1) => {
			async.map(ports, (p, done2) => {
				console.log("Querying port: "+ p);
				request({
					url: 'http://localhost:' + p + '/',
					method: 'POST',
					json: {username: usr}
				}, done2)
			}, done1)
		}, next)
	}, () => {
		request({
			url: 'http://localhost:' + ports[0] + '/ranking'
		}, (err, resp, body) => {
			console.log(body)
		})
	})
}, 2000);