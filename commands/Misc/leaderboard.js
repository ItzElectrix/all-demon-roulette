const {
    MessageEmbed
} = require('discord.js')
module.exports = {
    name: "leaderboard",
    description: "View the completed roulette leaderboard!",
    helpInfo: "Sends a message with the top 10 players in the server with the most demon roulettes completed.",
    category: "Misc",
    guildOnly: true,
    aliases: ["lb", "leaderboards"],
    helpOrder: 8,
    exec: async (client, message, args) => {
        const userQuery = client.db.prepare(`SELECT * FROM profiles WHERE userID = ?`)
        let user = await userQuery.get(message.author.id)
        if (!user) {
            await client.db.prepare(`INSERT INTO profiles (userID, completedRoulette, rouletteNumber, recentPercentage, recentDemonStr, inRoulette, userTag) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(message.author.id, 0, 0, 0, "", 0, message.author.tag);
            user = await userQuery.get(message.author.id) // actually never thought of doing this, good job
        }
        if (user.inRoulette) return message.reply(`Sorry, but you can only view leaderboards when you're not in a roulette. Wait until your roulette is finished.`);
        let page = 0;
        let row = client.db.prepare(`SELECT * FROM profiles ORDER BY completedRoulette DESC LIMIT 10 OFFSET ${page * 10}`).all();
        /*if (!row) {
            insert = db.prepare(`INSERT INTO profiles (userID, completedRoulette, rouletteNumber, recentPercentage, recentDemonStr, inRoulette, userTag) VALUES (?, ?, ?, ?, ?, ?, ?)`);
            insert.run(message.author.id, 0, 0, 0, "", 0, message.author.tag);
        } excuse me, why are you trying to enter data thats already inserted? */
        let lbString = [];
        let placement = 0;
        for (let i = 0; i < row.length; i++) {
            placement++;
            if (!await message.guild.members.fetch(row[i].userID)) {
                placement--;
                continue;
            };
            lbString.push(`**${placement}.** \`${row[i].userTag}\`\n**Completed Roulettes:** ${row[i].completedRoulette}`);
        }
        if (!lbString.length) return message.channel.send(`No one in this server has started a Demon Roulette.`);
        message.reply({
            allowedMentions: {
                repliedUser: false
            },
            embeds: [new MessageEmbed()
                .setTitle(`<:global_rank:745754626816737331> Demon Roulette Leaderboard`)
                .setDescription(`***__Top 10 users in this server ordered by completed Demon Roulettes__***\n\n${lbString.join("\n\n")}`).setColor(0x00ffcc)
            ]
        });
    }
}