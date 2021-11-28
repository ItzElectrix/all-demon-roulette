const {
    MessageEmbed,
    MessageSelectMenu,
    MessageActionRow,
    MessageButton
} = require('discord.js')

module.exports = {
    name: "start",
    description: "Starts a Demon Roulette!",
    helpInfo: "Starts a Demon Roulette by configuring what demons you want to use in it.",
    category: "Roulette",
    guildOnly: true,
    helpOrder: 5,
    exec: async (client, message, args) => {
        const {
            randomStr
        } = client.libs.randomLib
        let botMember = message.guild.members.cache.get(client.user.id);
        let perms = botMember.permissions; // Not sure why you're checking against a Permission class when it isn't related to the bot.
        if (!perms.has('MANAGE_MESSAGES') || !perms.has('ADD_REACTIONS') || !perms.has('USE_EXTERNAL_EMOJIS')) {
            let msgPerm = perms.has('MANAGE_MESSAGES');
            let reactPerm = perms.has('ADD_REACTIONS');
            let extPerm = perms.has('USE_EXTERNAL_EMOJIS');
            message.reply({
                embeds: [new MessageEmbed()
                    .setAuthor('Missing Permissions', message.author.displayAvatarURL())
                    .setColor(0xff0000)
                    .setDescription(`The bot needs these permissions in this server before starting a roulette:${!msgPerm ? "\n`MANAGE_MESSAGES`" : ""}${!reactPerm ? '\n\`ADD_REACTIONS\`' : ""}${!extPerm ? '\n\`USE_EXTERNAL_EMOJIS\`' : ""}`)
                    .setTimestamp()
                ]
            });
        } else {
            const sessionID = randomStr(8);
            let demonOptions = [{
                label: 'Easy Demon',
                value: 'Easy',
                emoji: client.utils.demons.easy
            }, {
                label: 'Medium Demon',
                value: 'Medium',
                emoji: client.utils.demons.medium
            }, {
                label: 'Hard Demon',
                value: 'Hard',
                emoji: client.utils.demons.hard
            }, {
                label: 'Insane Demon',
                value: 'Insane',
                emoji: client.utils.demons.insane
            }, {
                label: 'Extreme Demon',
                value: 'Extreme',
                emoji: client.utils.demons.extreme
            }]
            const startButton = new MessageButton()
                .setCustomId(`roulette_play_${sessionID}`)
                .setEmoji(client.utils.play)
                .setLabel("Play")
                .setStyle('SUCCESS')
            const stopButton = new MessageButton()
                .setCustomId(`roulette_cross_${sessionID}`)
                .setEmoji(client.utils.cross)
                .setLabel("Cancel")
                .setStyle('DANGER')
            const demonMenu = new MessageSelectMenu()
                .setCustomId(`roulette_demon_menu_${sessionID}`)
                .setPlaceholder('Select to the demon faces on this dropdown!')
                .addOptions(demonOptions)
                .setMaxValues(5)
                .setMinValues(0)
            const userQuery = client.db.prepare(`SELECT * FROM profiles WHERE userID = ?`)
            let user = await userQuery.get(message.author.id)
            if (!user) {
                await client.db.prepare(`INSERT INTO profiles (userID, completedRoulette, rouletteNumber, recentPercentage, recentDemonStr, inRoulette, userTag) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(message.author.id, 0, 0, 0, "", 0, message.author.tag);
                user = await userQuery.get(message.author.id) // actually never thought of doing this, good job
            }
            if (user.inRoulette) return message.reply({
                embeds: [new MessageEmbed()
                    .setAuthor(`Error`, message.author.displayAvatarURL())
                    .setDescription(`You are already in a demon roulette.\nIf you believe this is incorrect:\n● \`${client.config.prefix}stop\` - Ends the roulette you're currently in\n● \`${client.config.prefix}refresh\` - Refreshes your roulette in the current channel\n● \`${client.config.prefix}complete <percentage>\` - Completes the demon you're currently on`)
                    .setColor(0xff0000)
                ],
                allowedMentions: {
                    repliedUser: false
                }
            });
            await client.db.prepare(`UPDATE profiles SET inRoulette = 1 WHERE userID = ?`).run(message.author.id);
            message.reply({
                embeds: [new MessageEmbed()
                    .setAuthor(`You have successfully started a demon roulette!`, message.author.displayAvatarURL())
                    .setDescription(`**Rules for the Demon Roulette**
● You will be given a random demon to play. Upon playing it, you must get 1% on it.
● If you reach 1%, react with <:success:743975403034509333>, and you will be given a new level. With that level, you'll need to achieve a higher percent than with the previous level.
● Getting 100% on a level means you completed the challenge, but if you die at a different percent, you'll need to get something higher on the next.
● Try and get as many demons as you can! React with <:failed:744386894418280480> whenever you believe you can't go any further.

**Please react to the demon faces below to determine what demons you use in the roulette. When you are ready, react with <:play:744386993395597383> to begin.** (Or react with <:cross:744310641166123188> to stop the roulette.)`)
                    .setFooter(`Inspired by Npesta's Extreme Demon Roulette`).setTimestamp()
                ],
                components: [new MessageActionRow().addComponents(demonMenu), new MessageActionRow().addComponents(startButton, stopButton)],
                allowedMentions: {
                    repliedUser: false
                },
                fetchReply: true
            }).then(async m => {
                const filter = i => [`roulette_play_${sessionID}`, `roulette_cross_${sessionID}`, `roulette_demon_menu_${sessionID}`].includes(i.customId) && i.applicationId == client.user.id
                let collector = await message.channel.createMessageComponentCollector({
                    filter,
                    time: 5 * (60 * 1000)
                });
                let demonsSelected = [];
                let showEnd = true;
                collector.on('collect', r => {
                    if (r.user.id != message.author.id) return r.reply({
                        content: "**If you want to play, use the `" + client.config.prefix + "play` command.**",
                        ephemeral: true
                    });
                    if (r.isSelectMenu() && r.customId == `roulette_demon_menu_${sessionID}`) {
                        r.deferUpdate();
                        demonsSelected = r.values;
                    } else if (r.isButton()) {
                        r.deferUpdate();
                        switch (r.customId) {
                            case `roulette_play_${sessionID}`:
                                if (!demonsSelected.length) return r.followUp({
                                    content: "**Please select at least one of the demon difficulties before starting!**",
                                    ephemeral: true
                                });
                                showEnd = false;
                                collector.stop();
                                if (!client.db.prepare(`SELECT count(*) FROM currentLevel WHERE userID = ?`).pluck().get(message.author.id)) {
                                    const easyDemon = (demonsSelected.includes("Easy")) ? 1 : 0,
                                          mediumDemon = (demonsSelected.includes("Medium")) ? 1 : 0,
                                          hardDemon = (demonsSelected.includes("Hard")) ? 1 : 0,
                                          insaneDemon = (demonsSelected.includes("Insane")) ? 1 : 0,
                                          extremeDemon = (demonsSelected.includes("Extreme")) ? 1 : 0;
                                    client.db.prepare(`INSERT INTO currentLevel (userID, levelID, levelName, levelAuthor, demonDiff, levelFeatured, levelEpic, percentage, demonNum, easy, medium, hard, insane, extreme, demonStr, messageID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(message.author.id, 0, "", "", 0, 0, 0, 1, 1, easyDemon, mediumDemon, hardDemon, insaneDemon, extremeDemon, "", "");
                                }
                                client.db.prepare(`UPDATE profiles SET rouletteNumber = rouletteNumber + 1 WHERE userID = ?`).run(message.author.id);
                                client.funcs.findLevel(message, demonsSelected, 1, 1, m);
                                break;
                            case `roulette_cross_${sessionID}`:
                                client.db.prepare(`UPDATE profiles SET inRoulette = 0 WHERE userID = ?`).run(message.author.id);
                                collector.stop();
                                break;
                        }
                    } else {
                        r.deferUpdate();
                    }
                });
                collector.on('end', () => {
                    if (showEnd) return m.edit({
                        embeds: [new MessageEmbed().setTitle("Demon roulette has been cancelled.")],
                        components: []
                    })
                })

            })
        }
    }
}