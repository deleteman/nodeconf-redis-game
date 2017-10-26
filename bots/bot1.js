const request = require("request"),
	async = require("async");

const usernames = ["fernando", "deleteman", "andres", "juan", "carlos"];

const ports = [9090, 9091];
const totalRequests = 100;


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
