const request = require("request"),
	async = require("async");

const usernames = ["fernando", "deleteman", "andres", "juan", "carlos"];

const ports = [9090, 9091];
const totalRequests = 10;

/*
This bot hits all servers 10 times every 2 seconds
The expected behavior is that every 2 seconds, each user will have its score increased by 1
(all extra hits will be ignored by the server)
*/
setInterval(() => {
	async.times(totalRequests, (n, next) => {
		async.map(usernames, (usr, done1) => {
			async.map(ports, (p, done2) => {
				console.log("Querying port: "+ p);
				request({
					url: 'http://localhost:' + p + '/',
					method: 'POST',
					json: {username: usr}
				}, done2)
			}, done1)
		}, () => {
			console.log("FINISHED ITERATION ", n);
			next();
		})
	}, () => {
		request({
			url: 'http://localhost:' + ports[0] + '/ranking'
		}, (err, resp, body) => {
			console.log(body)
		})
	})
}, 2000);