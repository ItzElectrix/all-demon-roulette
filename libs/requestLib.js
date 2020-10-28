const request = require('request');
const randomLib = require('./randomLib');
const mainLib = require('./mainLib');
const levelLib = require('./levelLib');

module.exports = {
    getLevel: function (easy, medium, hard, insane, extreme, array, callback) {
        let demonChoice = mainLib.getDemonChoice(easy, medium, hard, insane, extreme, array);
        request.post({url: 'http://www.boomlings.com/database/getGJLevels21.php', form: {
            gameVersion: '21',
            binaryVersion: '35',
            gdw: '0',
            type: '2',
            diff: "-2",
            str: "",
            len: "-",
            page: '0',
            demonFilter: demonChoice,
            secret: "Wmfd2893gb7"
        }
    }, function (err, response, body) {
        if (err) return console.error(err);
        else if (body == -1) return -1;
        else {
            let splitBody = body.split("#")[3].split(":")[0];
            let levelChoice = randomLib.generateRandomLevel(splitBody);
            request.post({url: 'http://www.boomlings.com/database/getGJLevels21.php', form: {
                gameVersion: '21',
                binaryVersion: '35',
                gdw: '0',
                type: '2',
                diff: '-2',
                page: levelChoice[0],
                demonFilter: demonChoice,
                secret: 'Wmfd2893gb7'
            }
        }, function (err, response, body) {
            if (err) return console.error(err);
            else if (body == -1) return -1;
            else {
                let object = mainLib.formatData(body.split('#')[0].split('|')[levelChoice[1]]);
                let LEVELID = object["1"];
                if (!LEVELID) return -1;
                let LEVELNAME = object["2"];
                let AUTHORID = object["6"];
                let FEATURED = object["19"];
                let EPIC = object["42"];
                let DEMONDIFFICULTY = object["43"];
                let AUTHORNAME = "-";
                levelLib.getUserName(AUTHORID, function(info) {
                    if (!info || info == "-1") AUTHORNAME == "-";
                    else AUTHORNAME = info;
                    return callback([LEVELID, LEVELNAME, AUTHORNAME, DEMONDIFFICULTY, FEATURED, EPIC]);
                });
            }
        });
        }
    });
},
getPointercrateDemon: function (info, callback) {
    if (info[3] == 6) {
    request.get('https://www.pointercrate.com/api/v1/demons/?name=' + info[1], function (err, response, demonList) {
        if (err) return;
        let demon = JSON.parse(demonList);
        if (!demon[0] || demon[0] == undefined) return callback("");
        if (demon[0].position <= 150) return callback(`\n**Placement on Demon List:** [#${demon[0].position}](${demon[0].video})`);
        else return callback("");
    });
} else return callback("");
}
} //i think it might be working
//thats good