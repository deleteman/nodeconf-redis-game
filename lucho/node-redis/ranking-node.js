var config = require("./config.json"),
    userId,
    ranking = {},
    finalRanking = [];

console.log("100% Node.js");
console.log(config.maxUsers.toLocaleString('en-US') + " users doing " + config.maxRequests.toLocaleString('en-US') + " calls to add point and read the ranking");
var start = new Date();

for (var i = 0; i < config.maxRequests; i++) {
    userId = Math.floor(Math.random() * config.maxUsers);

    if(ranking[userId]) {
        ranking[userId].points++;
    } else {
        ranking[userId] = { userId: userId, points: 1}
    }

    finalRanking = Object.values(ranking).sort((a,b) => { return b.points - a.points; }); // this takes > 95% of processing time
    // ---> insert the ranking in the request's response, and send the reponse.
}

var end = new Date();
console.log((end.getTime()-start.getTime()).toLocaleString('en-US') + " milliseconds!");

for (var i = 0; i < 10; i++) {
    console.log(finalRanking[i].userId, finalRanking[i].points);
}
