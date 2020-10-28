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
    }
}