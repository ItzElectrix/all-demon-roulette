const { MessageEmbed } = require('discord.js')
module.exports = {
    name: "profile",
    description: "View your profile!",
    helpInfo: "Allows you to check your stats on the bot, such as roulettes you have completed.",
    category: "Misc",
    guildOnly: true,
    usage: "[userID or mention]",
    helpOrder: 7,
    exec: async (client, message, args) => {
        let mentionUser;
        let userIDArg;
        if (!message.interaction) {
            mentionUser = message.mentions.users.first();
            userIDArg = args[0]
        } else {
            mentionUser = message.options.getMember("user");
        }

        async function getUser(userID) {
            let user = client.db.prepare(`SELECT * FROM profiles WHERE userID = ?`).get(userID);
            if (!user) return message.reply(`Either that user doesn't exist, or they haven't played in the Demon Roulette. Please try again.`);
            
            let newNewRow = client.db.prepare(`SELECT * FROM profiles WHERE userID = ?`).get(message.author.id);
            if (!newNewRow) {
                client.db.prepare(`INSERT INTO profiles (userID, completedRoulette, rouletteNumber, recentPercentage, recentDemonStr, inRoulette, userTag) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(message.author.id, 0, 0, 0, "", 0, message.author.tag);;
                newNewRow = client.db.prepare(`SELECT * FROM profiles WHERE userID = ?`).get(message.author.id);
            }
            if (newNewRow.inRoulette) return message.reply(`**Sorry, but you can only view profiles when you're not in a roulette. Wait until your roulette is finished.**`);
            let newDemonChoi = user.recentDemonStr;
            if (newDemonChoi == "" || !newDemonChoi) newDemonChoi = "*None*";
            let discordUser = await message.guild.members.fetch(userID)
            if (!discordUser) return message.reply("**The discord user you've mentioned isn't on this server!**")
            message.reply({
                allowedMentions: {
                    repliedUser: false
                },
                embeds: [new MessageEmbed()
                    .setAuthor(`${discordUser.user.username}'s Profile`, discordUser.user.displayAvatarURL())
                    .setDescription(`● **Total Roulettes:** ${user.rouletteNumber}\n● **Completed Roulettes:** ${user.completedRoulette}\n● **Most Recent Percentage:** ${user.recentPercentage}\n● **Most Recent Demon Choice(s):** ${newDemonChoi}`)
                    .setColor(discordUser.displayHexColor)
                    .setFooter(`User ID: ${userID}`).setTimestamp()]
            });
        }

        if (mentionUser) {
            getUser(mentionUser.id);
        } else if (!isNaN(userIDArg)) {
            getUser(parseInt(userIDArg))
        } else {
            getUser(message.author.id);
        }
    }
}