const { Permissions } = require('discord.js')
module.exports = {
    name: "invite",
    description: "Invite this bot to your own server!",
    helpInfo: "Sends a link to invite the bot to your server.",
    category: "General",
    guildOnly: false,
    helpOrder: 2,
    exec: async (client, message, args) => {
        const link = client.generateInvite({
            permissions: [
                Permissions.FLAGS.SEND_MESSAGES,
                Permissions.FLAGS.MANAGE_MESSAGES,
                Permissions.FLAGS.USE_EXTERNAL_EMOJIS,
                Permissions.FLAGS.VIEW_CHANNEL,
                Permissions.FLAGS.ADD_REACTIONS,
                Permissions.FLAGS.EMBED_LINKS,
                Permissions.FLAGS.USE_APPLICATION_COMMANDS
                
            ],
            scopes: ['bot', 'applications.commands'],
        });
        message.reply(`Use this link to invite the Demon Roulette bot to your server! ${link}`);
    }
}