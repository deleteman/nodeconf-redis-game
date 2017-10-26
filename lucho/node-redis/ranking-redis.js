var redis = require('redis');
var client = redis.createClient(); 

var config = require("./config.json"),
    userId,
    pendingRequests = 0;
    
client.on('connect', function() {
    console.log('connected');

    // remove all keys from previous tests, if any
    client.del('redistest', function(){

        console.log("REDIS solution");
        console.log(config.maxUsers.toLocaleString('en-US') + " users doing " + config.maxRequests.toLocaleString('en-US') + " calls to add point and read the ranking");
        var start = new Date();

        for (var i = 0; i < config.maxRequests; i++) {
            userId = Math.floor(Math.random() * config.maxUsers);
            pendingRequests++;
            client.zincrby('redistest', 1, userId, function() {
                client.zrevrange('redistest', 0, 10, 'withscores', function(err, members) {
                        // ---> insert the ranking in the request's response, and send the reponse.
                        pendingRequests--;
                        if(pendingRequests == 0) return finalCallback(start, client, members); 
                });
            });
        }
    });
});


function finalCallback(start, client, members) {
    var end = new Date();
    console.log((end.getTime()-start.getTime()).toLocaleString('en-US') + " milliseconds!");

    client.zrevrange('redistest', 0, 10, 'withscores', function(err, members) {
        for (var i = 0; i < 20; i += 2) {
            console.log(members[i], members[i + 1]);
        }

        process.exit(0);
    })
}
