const { Permissions } = require('discord.js')
module.exports = {
    name: "server",
    description: "Join the support server!",
    helpInfo: "Sends a link to join the support server for the bot.",
    category: "General",
    guildOnly: false,
    helpOrder: 3,
    exec: async (client, message, args) => {
        message.reply(`Use this link to join the support server for the Geometry Dash Demon Roulette! ${client.utils.serverLink}`);
    }
}