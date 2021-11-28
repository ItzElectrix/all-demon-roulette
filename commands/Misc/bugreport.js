const {
    MessageEmbed
} = require('discord.js')
module.exports = {
    name: "bugreport",
    description: "Report any bugs the bot has!",
    helpInfo: "Sends a report to the bot\'s owners to fix any errors or issues that happen with the bot. You should specify exactly what you did to encounter this bug and what it says.",
    category: "Misc",
    guildOnly: true,
    usage: "<report (fewer than 500 characters)>",
    helpOrder: 10,
    exec: async (client, message, args) => {
        const hasSuggested = client.db.prepare('SELECT count(*) FROM bugs WHERE userId = ? AND isReviewed = 0').pluck().get(message.author.id)
        if (hasSuggested) return message.reply(`You can only report one bug at a time. Please wait until your previous report has been reviewed before you report something else.`);
        let report;
        if (message.interaction) {
            report = message.options.getString("report")
        } else {
            report = args.splice(0).join(" ");
        }
        if (!report || report.length > 500) return message.reply({
            embed: new MessageEmbed().setAuthor(`Invalid Syntax`, message.author.displayAvatarURL()).setDescription(`Correct Usage:\n\`${client.config.prefix}bugreport <bug (must be fewer than 500 characters)>\``).setColor(0xff0000).setTimestamp()
        });
        client.db.prepare(`INSERT INTO suggestions (userID, suggestion, isReviewed) VALUES (?, ?, ?)`).run(message.author.id, Buffer.from(suggestion).toString('base64'), 0);
        const bugID = client.db.prepare(`SELECT bugID FROM bugs WHERE userID = ? ORDER BY bugID DESC LIMIT 1`).pluck().get(message.author.id);
        client.guilds.cache.get(client.utils.guildID).channels.cache.get(client.utils.channels.bugs).send({
            embeds: [new MessageEmbed()
            .setAuthor(`New Bug Report`, message.author.displayAvatarURL())
            .setDescription(`**Bug:** ${report}`)
            .setColor(0x99ccff).setTimestamp()
            .setFooter(`ID: ${bugID}`)]
        });
        message.reply(`<:success:743975403034509333> Bug reported!`);
    }
}