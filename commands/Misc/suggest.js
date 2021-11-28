const {
    MessageEmbed
} = require('discord.js')
module.exports = {
    name: "suggest",
    description: "Suggest something for the bot!",
    helpInfo: "Sends a suggestion to owners that may help benefit the bot. You can only suggest one thing before it gets reviewed.",
    category: "Misc",
    guildOnly: true,
    usage: "<suggestion (fewer than 500 characters)>",
    helpOrder: 9,
    exec: async (client, message, args) => {
        const hasSuggested = client.db.prepare('SELECT count(*) FROM suggestions WHERE userId = ? AND isReviewed = 0').pluck().get(message.author.id)
        if (hasSuggested) return message.reply(`You can only suggest one thing at a time. Please wait until your previous suggestion as been reviewed before you suggest something else.`);
        let suggestion;
        if (message.interaction) {
            suggestion = message.options.getString("suggestion")
        } else {
            suggestion = args.splice(0).join(" ");
        }
        if (!suggestion || suggestion.length > 500) return message.reply({
            embeds: [new MessageEmbed().setAuthor(`Invalid Syntax`, message.author.displayAvatarURL()).setDescription(`Correct Usage:\n\`${client.config.prefix}suggest <suggestion (must be fewer than 500 characters)>\``).setColor(0xff0000).setTimestamp()]
        });
        client.db.prepare(`INSERT INTO suggestions (userID, suggestion, isReviewed) VALUES (?, ?, ?)`).run(message.author.id, Buffer.from(suggestion).toString('base64'), 0);
        const suggestID = client.db.prepare(`SELECT suggestID FROM suggestions WHERE userID = ? ORDER BY suggestID DESC LIMIT 1`).pluck().get(message.author.id);
        client.guilds.cache.get(client.utils.guildID).channels.cache.get(client.utils.channels.suggestions).send({
            embeds: [new MessageEmbed()
            .setAuthor(`New Suggestion`, message.author.displayAvatarURL())
            .setDescription(`**Suggestion:** ${suggestion}`)
            .setColor(0xff99ff).setTimestamp()
            .setFooter(`ID: ${suggestID}`)]
        });
        message.reply(`<:success:743975403034509333> Suggestion added!`);
    }
}