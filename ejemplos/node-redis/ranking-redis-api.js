var http = require('http');
var express = require('express');
var app = express();
var redis = require('redis');
var client = redis.createClient(); 

var config = require("./config.json"),
    userId,
    rpm = Array(60).fill(0);
    
client.on('connect', function() {
    console.log('connected');
    // remove all keys from previous tests, if any
    client.del('redistest', function(){
        console.log('ranking is emtpy');
    });
});

// routes
app.get('/:id(\\d+)', function (req, res) {
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
server.listen(9090);
console.log('Ranking service (Redis) started on HTTP:9090');
