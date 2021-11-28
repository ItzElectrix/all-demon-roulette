module.exports = {
    name: "ping",
    description: "Tests the bot's ping!",
    helpInfo: "Sends a message that tests the bot's response time on Discord.",
    category: "General",
    guildOnly: false,
    helpOrder: 0,
    exec: async (client, message, args) => {
        message.reply({
            content: `:ping_pong:`,
            allowedMentions: {
                repliedUser: false
            },
            fetchReply: true
        }).then(m => {
            m.edit({
                content: `Pong! Latency: \`${m.createdTimestamp - message.createdTimestamp} ms.\``,
                allowedMentions: {
                    repliedUser: false
                }
            });
        });
    }
}