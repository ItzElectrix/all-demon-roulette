const {
    MessageEmbed
} = require('discord.js')
module.exports = {
    name: "review",
    description: "Review a suggestion! **(bot owners only)**",
    helpInfo: "Reviews a suggestion from the bot, and will send a message to the user that originally made the suggestion. **Can only be done by bot owners.**",
    category: "Misc",
    guildOnly: true,
    usage: "<bug or suggestion> <ID> <review (fewer than 500 characters)>",
    helpOrder: 11,
    exec: async (client, message, args) => {
        if (!client.utils.ID.ownerIDs.includes(message.author.id)) return message.channel.send(`You do not have permission to use this command.`);
        let review = args.splice(2).join(" ");
        if (!args[0] || !['suggestion', 'bug', 's', 'b'].includes(args[0]) || !args[1] || isNaN(parseInt(args[1])) || !review || review.length > 500) return message.channel.send({
            embeds: [new MessageEmbed().setAuthor(`Invalid Syntax`, message.author.displayAvatarURL()).setDescription(`Correct Usage:\n\`${client.config.prefix}review <suggestion or bug> <ID> <review (must be fewer than 500 characters)>\``).setColor(0xff0000).setTimestamp()]
        });
        switch (args[0]) {
            case 'suggestion':
            case 's': {
                let row = client.db.prepare(`SELECT * FROM suggestions WHERE suggestID = ?`).get(args[1]);
                if (!row) return message.channel.send(`Sorry, but that suggestion ID doesn't exist.`);
                if (row.isReviewed) return message.channel.send(`Sorry, but that suggestion has already been reviewed.`);
                client.guilds.cache.get(client.utils.guildID).channels.cache.get(client.utils.channels.suggestions).send({
                    embeds: [new MessageEmbed()
                        .setAuthor(`Suggestion Reviewed`, message.author.displayAvatarURL())
                        .setDescription(`**Original Suggestion:** ${Buffer.from(row.suggestion, 'base64').toString()}\n**Review:** ${review}`)
                        .setColor(0xff9966).setTimestamp()
                        .setFooter(`Reviewed by ${message.author.tag}`)]
                });
                client.users.cache.get(row.userID).send({
                    embeds: [new MessageEmbed()
                        .setAuthor(`Suggestion Reviewed`, message.author.displayAvatarURL())
                        .setDescription(`Your most recent suggestion for the bot has been reviewed by **${message.author.tag}!**\n\n**Original Suggestion:** ${Buffer.from(row.suggestion, 'base64').toString()}\n**Review:** ${review}`)
                        .setColor(0xff9966).setTimestamp()]
                });
                client.db.prepare(`UPDATE suggestions SET isReviewed = 1 WHERE suggestID = ?`).run(args[1]);
                return message.channel.send(`<:success:743975403034509333> Suggestion reviewed!`);
            }
            case 'bug':
            case 'b': {
                let row = client.db.prepare(`SELECT * FROM bugs WHERE bugID = ?`).get(args[1]);
                if (!row) return message.channel.send(`Sorry, but that bug report ID doesn't exist.`);
                if (row.isReviewed) return message.channel.send(`Sorry, but that bug report has already been reviewed.`);
                client.guilds.cache.get(client.utils.guildID).channels.cache.get(client.utils.channels.bugs).send({
                    embeds: [new MessageEmbed()
                        .setAuthor(`Bug Report Reviewed`, message.author.displayAvatarURL())
                        .setDescription(`**Original Bug Report:** ${Buffer.from(row.bugReport, 'base64').toString()}\n**Review:** ${review}`)
                        .setColor(0x66ff66).setTimestamp()
                        .setFooter(`Reviewed by ${message.author.tag}`)]
                });
                client.users.cache.get(row.userID).send({
                    embeds: [new MessageEmbed()
                        .setAuthor(`Bug Report Reviewed`, message.author.displayAvatarURL())
                        .setDescription(`Your most recent bug report for the bot has been reviewed by **${message.author.tag}!**\n\n**Original Report:** ${Buffer.from(row.bugReport, 'base64').toString()}\n**Review:** ${review}`)
                        .setColor(0x66ff66).setTimestamp()]
                });
                client.db.prepare(`UPDATE bugs SET isReviewed = 1 WHERE bugID = ?`).run(args[1]);
                return message.channel.send(`<:success:743975403034509333> Bug reviewed!`);
            }
            default: return message.reply("unknown category")
        }
    }
}