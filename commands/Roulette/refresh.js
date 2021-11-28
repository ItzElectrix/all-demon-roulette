const {
    MessageEmbed,
} = require('discord.js')
module.exports = {
    name: "refresh",
    description: "Refreshes the demon you are currently on! (Only use if bot doesn't work properly)",
    helpInfo: 'Refreshes your current demon roulette. (Only use it if the bot crashes or doesn\'t work properly)',
    category: "Roulette",
    guildOnly: true,
    helpOrder: 13,
    exec: async (client, message, args) => {
        let profile = client.db.prepare(`SELECT inRoulette FROM profiles WHERE userID = ?`).get(message.author.id);
        if (!profile || !profile.inRoulette) return message.reply(`You need to be in a demon roulette to use this command. To begin one, type \`${client.config.prefix}start\`.`);

        let row = client.db.prepare(`SELECT * FROM currentLevel WHERE userID = ?`).get(message.author.id);
        if (!row) return message.reply(`You need to be in a demon roulette to use this command. To begin one, type \`${client.config.prefix}start\`.`);
        if (client.cooldowns.has(message.author.id)) return message.reply({
            embeds: [new MessageEmbed().setAuthor("Error", message.author.displayAvatarURL()).setDescription("You need to wait **15 seconds** after the demon is chosen before you can refresh.")]
        });
        let infoArray = [row.levelID, row.levelName, row.levelAuthor, row.demonDiff, row.levelFeatured, row.levelEpic];

        let demonsSelected = [];
        (row.easy) && demonsSelected.push("Easy");
        (row.medium) && demonsSelected.push("Medium");
        (row.hard) && demonsSelected.push("Hard");
        (row.insane) && demonsSelected.push("Insane");
        (row.extreme) && demonsSelected.push("Extreme");


        client.libs.requestLib.getPointercrateDemon(infoArray, function (pointercrate) {
            //client.funcs.getRouletteEmbed(message, row.demonNum, row.percentage, infoArray, row.demonStr, "", pointercrate);
            client.funcs.getRouletteEmbed(message, row.demonNum, row.percentage, infoArray, demonsSelected, "", pointercrate);
        });


    }
}