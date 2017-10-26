/* 
 *   NodeConf Bot
 */

var config = require("config");
var request = require("request");

if (process.argv[2]) config.server.port = process.argv[2];
if (process.argv[3]) config.bots.userCount = process.argv[3];
config.slowMode = (process.argv[4] && process.argv[4] === "SLOW") ? true : false;

console.log("Starting bots. Config: ", config);

var baseURL = 'http://' + config.server.host,
    gatewayPort = config.server.port,
    activeInstances = [gatewayPort],
    retryUserId = null,
    rps = [0, 0],
    lastRPS = 0,
    lastRPSdisplayed = 0;

var requestData = {
    url: '',
    headers: { 'Content-Type': 'application/json' },
    json: true
};

var requestsSend = 0
    requestsSuccess = 0,
    lastRPS = 0,
    errors = 0;

// send request to onbtain the session id

sender = setInterval(function() {

    if (errors > config.bots.maxErrors) {
        clearInterval(sender);
        console.log("Too many errors. Exit.");
        process.exit(1);
    }

    rps[new Date().getSeconds() % 2]++;

    requestsSend++;
    var userId = retryUserId || Math.floor(Math.random() * config.bots.userCount);
    requestData.url = baseURL  + ':' + gatewayPort + '/' + userId;
    log(["URL", requestData.url]);

    request.get(requestData, function (err, response, body) {
        if (err) {
            console.log(err);
            // try other instance if available
            log(["instance unavailable on", activeInstances]);
            var unavailableInstance = activeInstances.indexOf(gatewayPort);
            if (unavailableInstance !== -1) {
                // remove the instance from the list of nown servers
                activeInstances.splice(unavailableInstance, 1);
                log(["instance", gatewayPort,"removed. current active instances", activeInstances]);
                if (activeInstances.length === 0) {
                    // if no more instances are available use the default
                    activeInstances.push(config.server.port);
                    log(["added default gateway. active instances", activeInstances]);
                }
                gatewayPort = activeInstances[Math.floor(Math.random() * activeInstances.length)];
                log(["choosing", gatewayPort, "from active instances", activeInstances]);
            }

            errors++;
            return;
        }

        if (response.statusCode !== 200) {
          console.log('ranking service returned error ' + response.statusCode);
          errors++;
          return;
        }

        if (body.status && body.status === "rejected" && body.availableHosts && body.availableHosts.length > 0) {
           gatewayPort = body.availableHosts[Math.floor(Math.random() * body.availableHosts.length)];
            // add instances to the list of known active hosts
            body.availableHosts.forEach(function(instance) {
                if (activeInstances.indexOf(instance) === -1) {
                    activeInstances.push(instance);
                }    
            });
            // set the userId to retry
            retryUserId = userId;
        } else {
            // use any active server randomly
            gatewayPort = activeInstances[Math.floor(Math.random() * activeInstances.length)];
            retryUserId = null;
        }

        requestsSuccess++;
    });
}, (config.slowMode ? 1000 : 1));

DisplayStatus = setInterval(function() {
    var s = new Date().getSeconds() % 2;
    if (s !== lastRPSdisplayed) {
        lastRPS = rps[s];
        rps[s] = 0;
        lastRPSdisplayed = s;
    }
    if (!config.slowMode) process.stdout.write("RPS: " + lastRPS.toLocaleString('en-US') + " / Requests send: " + requestsSend.toLocaleString('en-US') + " / Requests Successfull: " + requestsSuccess.toLocaleString('en-US') + "         \r");
}, 1000);

function log(arr) {
    if (config.slowMode) {
        console.log(arr.toString().replace(/,/g, ' '));
    }
}

