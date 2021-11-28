const {
    MessageEmbed,
} = require('discord.js')
module.exports = {
    name: "complete",
    description: "Completes a demon in the roulette! (Only use if bot doesn't work properly)",
    helpInfo: 'Completes a demon in the roulette with the percentage provided. (Only use it of the bot crashes or doesn\'t work properly',
    category: "Roulette",
    usage: "<percentage>",
    guildOnly: true,
    helpOrder: 12,
    exec: async (client, message, args) => {
        let profile = client.db.prepare(`SELECT inRoulette FROM profiles WHERE userID = ?`).get(message.author.id);
        if (!profile || !profile.inRoulette) return message.reply(`Sorry, but this command can only be used when you're in a demon roulette. If you want to begin one, type \`${client.config.prefix}start\`.`);
        let percentage;
        if (message.interaction) {
            percentage = message.options.getInteger("percentage")
        } else {
            percentage = parseInt(args[0])
        }
        if (isNaN(percentage) || percentage < 1 || percentage > 100) return message.reply({
            embeds: [new MessageEmbed().setAuthor(`Invalid Syntax`, message.author.displayAvatarURL()).setDescription(`Correct Usage:\n\`${client.config.prefix}complete <percentage (must be between 1 and 100)>\``).setColor(0xff0000).setTimestamp()]
        });
        if (client.cooldowns.has(message.author.id)) return message.reply({
            embeds: [new MessageEmbed().setAuthor("Error", message.author.displayAvatarURL()).setDescription("You need to wait **15 seconds** after the demon is chosen before you can set the percentage.")]
        });
        if (percentage == 100) {
            client.funcs.completeRoulette(message, "", "", []);
        } else {
            let otherRow = client.db.prepare(`SELECT * FROM currentLevel WHERE userID = ?`).get(message.author.id);
            if (percentage < otherRow.percentage) return message.reply(`That is an invalid percentage. Please try again.`);
            client.db.prepare(`UPDATE currentLevel SET demonNum = demonNum + 1, percentage = ? WHERE userID = ?`).run(percentage + 1, message.author.id);
            let newRow = client.db.prepare(`SELECT * FROM currentLevel WHERE userID = ?`).get(message.author.id);
            let demonsSelected = [];
            (newRow.easy) && demonsSelected.push("Easy");
            (newRow.medium) && demonsSelected.push("Medium");
            (newRow.hard) && demonsSelected.push("Hard");
            (newRow.insane) && demonsSelected.push("Insane");
            (newRow.extreme) && demonsSelected.push("Extreme");
            
            client.funcs.findLevel(message, demonsSelected, newRow.demonNum, newRow.percentage, "");
        }

    }
}