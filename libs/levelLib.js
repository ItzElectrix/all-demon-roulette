const request = require('request');
const mainLib = require('./mainLib');

module.exports = {
    getUserName: function(AUTHORID, callback) {
        request.post({url: 'http://www.boomlings.com/database/getGJUsers20.php', form: {
            gameVersion: '21',
            binaryVersion: '35',
            gdw: '0',
            str: AUTHORID,
            secret: 'Wmfd2893gb7'
        }
    }, function (err, response, body) {
        if (err) return console.error(err);
        else if (body == -1) return callback(-1);
        else {
            let object = mainLib.formatData(body.split("#")[0]);
            return callback(object["1"]);
        }
    }); 
    }
}