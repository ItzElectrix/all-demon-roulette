const {
    MessageEmbed
} = require('discord.js')
module.exports = {
    name: "about",
    description: "Reveals bot info!",
    helpInfo: "Shows some information regarding the bot and what it does. Taken from the description on the website top.gg.",
    category: "General",
    guildOnly: false,
    helpOrder: 4,
    exec: async (client, message, args) => {
        message.reply({
            embeds: [new MessageEmbed()
                .setAuthor(`About the Demon Roulette`, client.user.displayAvatarURL())
                .setDescription(`The **Geometry Dash Demon Roulette** is a bot that works with all demons in Geometry Dash. This bot is inspired by the extreme demon roulette that Npesta created. You can check out his video for it [here.](https://www.youtube.com/watch?v=nv_9FkfGRsc)\n\nHere are the rules for how a Demon Roulette works:\n> You will be given a random demon to play. Upon playing it, you must get 1% on it.\n> Once you reach 1%, you will be given a new level. With that level, you'll need to achieve a higher percent than with the previous one.\n> Getting 100% on a level means you completed the challenge, but if you die at a different percent higher than your goal, you'll need to get something higher on the next.\n> Try and get as many demons as you can! The game ends when you can't go any further.\n\nType \`${client.config.prefix}help\` to see a list of all commands you can use for the bot!`)
                .setFooter(`Taken from top.gg description | Bot Version: ${client.utils.botVersion}`)
                .setColor(0x66ccff).setTimestamp()
            ],
            allowedMentions: {
                repliedUser: false
            }
        });
    }
}