const winston = require("winston");


const logFormatter = function(options) {
    // Return string will be passed to logger.

    return options.timestamp() +` [`+ options.level.toUpperCase() +
        `] `+ (options.message ? options.message : ``) +
        (options.meta && Object.keys(options.meta).length ?
            `\n\t`+ JSON.stringify(options.meta) : `` );
};


const timestamp = function() {
    const d = new Date();
    return d.getHours() + `:` + d.getMinutes() + `:` +
        d.getSeconds() + `m` + d.getMilliseconds();
};

const logger = new (winston.Logger)({
	level: 'debug',
	transports: [
		new (winston.transports.Console)({
			formatter: logFormatter,
			timestamp: timestamp
		})
	]
});

module.exports = logger;