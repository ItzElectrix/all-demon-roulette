const {
    readdirSync
} = require("fs");
module.exports = (client) => {
    const events = readdirSync(`./events/`).filter(file => file.endsWith(".js"));
    for (let file of events) {
        let pull = require(`../events/${file}`);
        const event = file.split(".")[0];
        client.on(event, pull.bind(null, client));
    }
}