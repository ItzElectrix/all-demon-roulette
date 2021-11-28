const {
    MessageEmbed,
    MessageButton,
    MessageActionRow
} = require('discord.js')
module.exports = {
    name: "stop",
    description: "Force quits a Demon Roulette!",
    helpInfo: 'Force quits a demon roulette. Use it only if the bot does something it shouldn\'t do, like say you\'re in a demon roulette when you actually aren\'t. (Say "yes" or "y" after the command to automatically stop)',
    category: "Roulette",
    usage: "[yes or y]",
    guildOnly: true,
    helpOrder: 6,
    exec: async (client, message, args) => {
        const {
            randomStr
        } = client.libs.randomLib
        let profile = client.db.prepare(`SELECT inRoulette FROM profiles WHERE userID = ?`).get(message.author.id);
        if (!profile || !profile.inRoulette) return message.reply({
            embeds: [new MessageEmbed().setTitle(`You are currently not in a Demon Roulette!`)]
        });
        function stopRoulette(m) {
            client.db.prepare(`UPDATE profiles SET inRoulette = 0 WHERE userID = ?`).run(message.author.id);
            client.db.prepare(`DELETE FROM currentLevel WHERE userID = ?`).run(message.author.id);
            if (client.listDemonList.get(message.author.id)) {
                client.listDemonList.delete(message.author.id);
            }
            let guild = client.guilds.cache.get(client.utils.guildID)
            if (guild) {
                guild.channels.cache.get(client.utils.channels.roulette).send({
                    embeds: [new MessageEmbed()
                        .setAuthor(`Roulette Stopped`, message.author.displayAvatarURL())
                        .setDescription(`**${message.author.tag}** has decided to force-quit the roulette.`)
                        .setColor(0xff0000)
                        .setFooter(`Guild: ${message.guild.name}`).setTimestamp()
                    ]
                });
            }
            const content = {
                embeds: [new MessageEmbed().setTitle(`Demon Roulette has been officially stopped by the user.`)
                    .setColor(0xff0000)
                ],
                components: []
            }
            if (m) {
                m.edit(content);
            } else {
                message.channel.send(content);
            }
        }
        if (!args[0]) {
            const sessionID = randomStr(8);
            const yesButton = new MessageButton()
                .setCustomId(`stop_yes_${sessionID}`)
                .setEmoji(client.utils.success)
                .setLabel("Yes")
                .setStyle('SUCCESS')
            const noButton = new MessageButton()
                .setCustomId(`stop_no_${sessionID}`)
                .setEmoji(client.utils.cross)
                .setLabel("No")
                .setStyle('DANGER')
            message.reply({
                embeds: [new MessageEmbed()
                    .setTitle(`Are you sure you want to end the Demon Roulette?`)
                    .setFooter(`WARNING: This will stop all progress on your current round. You will have to start over if you wish to play again.`)
                ],
                allowedMentions: {
                    repliedUser: false
                },
                fetchReply: true,
                components: [new MessageActionRow().addComponents(yesButton, noButton)]
            }).then(async mm => {
                const stopFilter = (i) => {
                    return [`stop_yes_${sessionID}`, `stop_no_${sessionID}`].includes(i.customId)
                }
                const stopCollector = await message.channel.createMessageComponentCollector({
                    stopFilter,
                    time: 5 * (60 * 1000)
                });
                let selected = false;
                stopCollector.on('collect', i => {
                    switch (i.customId) {
                        case `stop_yes_${sessionID}`:
                            selected = true;
                            stopRoulette(mm);
                            stopCollector.stop();
                            break;
                        case `stop_no_${sessionID}`:
                            stopCollector.stop()
                            break;
                    }
                });
                stopCollector.on('end', () => {
                    if (!selected) return mm.edit({embeds: [new MessageEmbed().setTitle("Cancelled.")], components: []})
                })
            });
        } else if (['yes', 'y'].includes(args[0].toLowerCase())) {
            return stopRoulette();
        };
    }
}