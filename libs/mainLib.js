const randomLib = require('./randomLib');
const requestLib = require('./requestLib');

module.exports = {
    formatData: function(data) {
        let array = data.split(':');
        let objectArray = {};
        for (let i = 0; i < array.length; i = i + 2) {
            objectArray[array[i]] = array[i + 1];
        }
        return objectArray;
    },
    getDemonChoice: function (easy, medium, hard, insane, extreme, array) {
        let demonChoice = randomLib.generateRandomDemon(easy, medium, hard, insane, extreme, array);
        switch (demonChoice) {
            case "Easy":
                return 1;
            case "Medium":
                return 2;
            case "Hard":
                return 3;
            case "Insane":
                return 4;
            case "Extreme":
                return 5;
        }
    },
    getMessageEmbed: function (diff) {
        diff = parseInt(diff);
        switch (diff) {
            case 3:
                return 0x6600ff;
            case 4:
                return 0xff00ff;
            case 0:
                return 0xff5050;
            case 5:
                return 0xcc0000;
            case 6:
                return 0x800000;
        }
    },
    getMessageThumbnail: function (diff, featured, epic) {
        diff = parseInt(diff);
        featured = parseInt(featured);
        epic = parseInt(epic);
        let diffIcon;
        switch (diff) {
            case 3:
                if (featured > 0 && epic == 0) {
                    diffIcon = "https://gdbrowser.com/difficulty/demon-easy-featured.png";
                } else if (epic == 1) {
                    diffIcon = "https://gdbrowser.com/difficulty/demon-easy-epic.png";
                } else diffIcon = "https://gdbrowser.com/difficulty/demon-easy.png";
                break;
            case 4:
                if (featured > 0 && epic == 0) {
                    diffIcon = "https://gdbrowser.com/difficulty/demon-medium-featured.png";
                } else if (epic == 1) {
                    diffIcon = "https://gdbrowser.com/difficulty/demon-medium-epic.png";
                } else diffIcon = "https://gdbrowser.com/difficulty/demon-medium.png";
                break;
            case 0:
                if (featured > 0 && epic == 0) {
                    diffIcon = "https://gdbrowser.com/difficulty/demon-hard-featured.png";
                } else if (epic == 1) {
                    diffIcon = "https://gdbrowser.com/difficulty/demon-hard-epic.png";
                } else diffIcon = "https://gdbrowser.com/difficulty/demon-hard.png";
                break;
            case 5:
                if (featured > 0 && epic == 0) {
                    diffIcon = "https://gdbrowser.com/difficulty/demon-insane-featured.png";
                } else if (epic == 1) {
                    diffIcon = "https://gdbrowser.com/difficulty/demon-insane-epic.png";
                } else diffIcon = "https://gdbrowser.com/difficulty/demon-insane.png";
                break;
            case 6: 
                if (featured > 0 && epic == 0) {
                    diffIcon = "https://gdbrowser.com/difficulty/demon-extreme-featured.png";
                } else if (epic == 1) {
                    diffIcon = "https://gdbrowser.com/difficulty/demon-extreme-epic.png";
                } else diffIcon = "https://gdbrowser.com/difficulty/demon-extreme.png";
                break;
        }
        return diffIcon;
    },
    getDemonDiff: function(diff) {
        diff = parseInt(diff);
        switch(diff) {
            case 3:
                return "Easy Demon";
            case 4:
                return "Medium Demon";
            case 0:
                return "Hard Demon";
            case 5:
                return "Insane Demon";
            case 6:
                return "Extreme Demon";
            }
    }
}