var http = require('http');
var express = require('express');
var app = express();
var redis = require('redis');
var client = redis.createClient(),
    subscriber = redis.createClient(),
    publisher  = redis.createClient();

var config = require("./config.json"),
    userId,
    rpm = Array(60).fill(0),
    blockedLocalUserIds = [],
    knownServerInstances = [];
    
config.serverPort = 9990;                                   // default port
if (process.argv[2]) config.serverPort = process.argv[2];   // allow the port to be configured from the command line

client.on('connect', function() {
    console.log('connected');
    // remove all keys from previous tests, if no other instances are active
    setTimeout(function() {
        if (knownServerInstances.length === 0) {
            client.del('redistest', function(){
                process.stdout.write('\nno other instances detected. ranking has been cleared.\n');
            });
        }
    }, 1000);
});

subscriber.on("message", function(channel, data) {
    switch (channel) {
        case "userHit":
            var blockedUser = JSON.parse(data);
            if (blockedUser.port && blockedUser.port === config.serverPort) {
                // ignore this message, since it must have been sent from this instance
                return;
            }

            var blockedUserId = blockedLocalUserIds.indexOf(blockedUser.userId);
            if (blockedUserId !== -1) {
                // remove the user from the list
                blockedLocalUserIds.splice(blockedUserId, 1);
            }
            break;
        case "addServerInstance":
            if (data === config.serverPort) {
                // ignore this message, since it must have been sent from this instance
                return;
            }
            var serverInstancePort = knownServerInstances.indexOf(data);
            // add the instance only if we don't have it in our own list
            if (serverInstancePort === -1) {
                knownServerInstances.push(data);
                // notify the new instance and others that the current instance is also available
                process.stdout.write("Adding port " + data + " to the list of active server instances\r\n");
                publisher.publish("addServerInstance", config.serverPort);
            }
            break;
        case "delServerInstance":
            var serverInstancePort = knownServerInstances.indexOf(data);
            if (knownServerInstances !== -1) {
                // remove the instance from the list of nown servers
                knownServerInstances.splice(serverInstancePort, 1);
                process.stdout.write("\r\nInstance on port " + data + " is no longer available\r\n");
            }
            break;
    }

});

subscriber.subscribe("userHit");
subscriber.subscribe("addServerInstance");
subscriber.subscribe("delServerInstance");

// routes
app.get('/:id(\\d+)', function (req, res) {

    if (knownServerInstances.length > 0 && blockedLocalUserIds.indexOf(req.params.id) > -1) {
        res.send({ "status": "rejected", "availableHosts": knownServerInstances });
        return;
    }

    // notify all other server instances that this user has been blocked on at least one instance
    publisher.publish("userHit", JSON.stringify({ port: config.serverPort, userId: req.params.id }));
    blockedLocalUserIds.push(req.params.id);

    var s = new Date().getSeconds();
    rpm[s]++;

    client.zincrby('redistest', 1, req.params.id, function() {
        client.zrevrange('redistest', 0, 10, 'withscores', function(err, ranking) {

            var currentRanking = [];
            for (var i = 0; i < 20; i += 2) {
                if (ranking[i]) {
                    currentRanking.push({ position: i/2, userId: ranking[i], points: ranking[i + 1] });
                }
            }

            res.send(currentRanking);
            return;
        });
    });
});

rpmCounter = setInterval(function() {
    var s = new Date().getSeconds();
    rpm[(s + 1 > 59) ? 0 : s + 1] = 0;
    var lastRps = rpm[(s === 0) ? 59 : s - 1];
    var projectedRPM = lastRps * 60;
    process.stdout.write("Instant RPM: " + projectedRPM.toLocaleString('en-US') + " / Current RPS: " + lastRps.toLocaleString('en-US') + "         \r");
}, 1000);

var server = http.createServer(app);
server.listen(config.serverPort);

console.log('Ranking service (Redis) started on HTTP:' + config.serverPort);
publisher.publish("addServerInstance", config.serverPort);

process.on('SIGINT', function() {
    console.log("\nCaught interrupt signal. Shutdown and notify all other active instances.");

    publisher.publish("delServerInstance", config.serverPort, function() {
        console.log("Done. Bye, bye...");
        process.exit(0);
    });

});