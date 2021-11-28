const request = require('request');

module.exports = (client) => {
	console.log('Connecting to Geometry Dash servers...');
    request.get({url: "http://www.boomlings.com/database"}, function (err, response, body) {
        if (err) return console.error(`ERROR: Failed to access Geometry Dash servers.\n${err}`);
    });
    console.log('Connected!');
    client.funcs.updateStatus();
    console.log('Bot ready!');
}