module.exports = {
    generateRandomLevel: function(total) {
        total = parseInt(total);
        let randomNum = Math.floor(Math.random() * total);
        let division = (randomNum / 10).toString();
        let array = division.split(".");
        if (!array[1]) {
            array[1] = '0';
        }
        return array;
    },
    generateRandomDemon: function(easy, medium, hard, insane, extreme, array) {
        easy = parseInt(easy);
        medium = parseInt(medium);
        hard = parseInt(hard);
        insane = parseInt(insane);
        extreme = parseInt(extreme);
        let choices = (easy + medium + hard + insane + extreme) - 1;
        let randomChoice = Math.round(Math.random() * choices);
        return array[randomChoice];
    },
    randomStr: function(length) {
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() *
                charactersLength));
        }
        return result;
    }
}