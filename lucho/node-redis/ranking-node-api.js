var http = require('http');
var express = require('express');
var app = express();

var config = require("./config.json"),
    userId,
    ranking = [],
    rpm = Array(60).fill(0);

console.log("100% Node.js");

// routes
app.get('/:id(\\d+)', function (req, res) {
    var s = new Date().getSeconds();
    rpm[s]++;

    for (var s = 0; s < ranking.length; s++) {
        if (ranking[s].userId == req.params.id) {
            ranking[s].points++;
            break;
        }
    }

    if (s == ranking.length) {
        ranking.push({ userId: req.params.id, points: 1 });
    }

    ranking.sort((a,b) => { return b.points - a.points; }); // this takes > 95% of processing time

    var currentRanking = [];
    for (var i = 0; i < 10; i++) {
        if (ranking[i]) {
            currentRanking.push({ position: i, userId: ranking[i].userId, points: ranking[i].points });
        }
    }

    res.send(currentRanking);
    return;
});

rpmCounter = setInterval(function() {
    var s = new Date().getSeconds();
    rpm[(s + 1 > 59) ? 0 : s + 1] = 0;
    var lastRps = rpm[(s === 0) ? 59 : s - 1];
    var projectedRPM = lastRps * 60;
    process.stdout.write("Instant RPM: " + projectedRPM.toLocaleString('en-US') + " / Current RPS: " + lastRps.toLocaleString('en-US') + "         \r");
}, 1000);

var server = http.createServer(app);
server.listen(8080);
console.log('Ranking service (100% Node.js) started on HTTP:8080');
