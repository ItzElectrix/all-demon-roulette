/**
 *  [ Demon Roulette Rewrite ]
 * - Contributors
 *   * ItzElectrix
 *   * Joey
 *   * Firee
 */
const {
    Client,
    Collection,
    Intents,
    Permissions,
    MessageEmbed
} = require('discord.js');
const client = new Client({
    autoReconnect: true,
    intents: [Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS
    ],
    allowedMentions: {
        parse: ['users', 'roles'],
        repliedUser: true
    }
});

const perms = new Permissions([
    'MANAGE_MESSAGES',
    'ADD_REACTIONS',
    'USE_EXTERNAL_EMOJIS'
]);

const sql = require('better-sqlite3')('database.sqlite');
client.config = require('./config.json');
client.utils = require('./utils.json');
client.commands = new Collection();
client.aliases = new Collection();
client.cooldowns = new Collection();
client.db = sql;

client.libs = {
    mainLib: require('./utils/mainLib'),
    levelLib: require('./utils/levelLib'),
    randomLib: require('./utils/randomLib'),
    requestLib: require('./utils/requestHandler.js')
}

client.listDemonList = new Map();

client.cooldowns = new Set();

client.funcs = { // Client functions that can be called anywhere.
    updateStatus: function () { // Updates the status of the bot.
        client.user.setPresence({
            activity: {
                name: `roulette in ${client.guilds.cache.size} servers... (${client.config.prefix}help)`
            },
            status: 'online'
        });
        return true;
    },
    receiveError: function (message, e) {
        if (!perms.has(['MANAGE_MESSAGES', 'ADD_REACTIONS', 'USE_EXTERNAL_EMOJIS'])) { // Why not check the Guild Member?
            message.author.send({
                embeds: [new MessageEmbed()
                    .setAuthor('An error has occured.', client.utils.images.x)
                    .setDescription(`Error: \`\`\`${e}\`\`\`Please try the command again. If the error persists, DM **${client.utils.botOwnerTag}** with a link or screenshot of this message, or go to the official support server. (To find server, type \`${client.config.prefix}server\`).`)
                    .setColor(0xff0000)
                    .setTimestamp()
                ]
            });
        } else {
            message.channel.send({
                embeds: [new MessageEmbed()
                    .setAuthor('An error has occured.', client.utils.images.x)
                    .setDescription(`Error: \`\`\`${e}\`\`\`Please try the command again. If the error persists, DM **${client.utils.botOwnerTag}** with a link or screenshot of this message, or go to the official support server. (To find server, type \`${client.config.prefix}server\`).`)
                    .setColor(0xff0000)
                    .setTimestamp()
                ]
            });
        }

        console.log(`Error from ${message.author.tag} in ${message.guild.name}. Error message: ${e.stack}`);
        if (client.guilds.cache.has(client.utils.guildID)) {
            client.guilds.cache.get(client.utils.guildID).channels.cache.get(client.utils.channels.errors).send({
                embed: new MessageEmbed()
                    .setAuthor(`An error has occured.`, client.utils.images.x)
                    .setDescription(`Error: \`\`\`${e.stack}\`\`\``)
                    .setColor(0xff0000)
                    .setFooter(`Caused by ${message.author.tag} in ${message.guild.name}`).setTimestamp()
            });
        }
        return;
    },

    getRouletteEmbed: function (message, num, percent, levelInfo, demonChoices, m, listDemon, setPercent) { // getData isnt required whawt
        try {
            message.channel.send({
                embeds: [new MessageEmbed()
                    .setAuthor(`Demon #${num}`, message.author.displayAvatarURL())
                    .setDescription(`**__${levelInfo[1]}__ by ${levelInfo[2]}** (${levelInfo[0]})${listDemon}\n\n**Required percent:** ${percent}%`) //0=level_id 1=name 2=author 3=demon_difficulty 4=featured 5=epic (levelInfo arg)
                    .setColor(client.libs.mainLib.getMessageEmbed(levelInfo[3]))
                    .setThumbnail(client.libs.mainLib.getMessageThumbnail(levelInfo[3], levelInfo[4], levelInfo[5]))
                ]
            }).then(async msg => {
                await client.db.prepare(`UPDATE currentLevel SET messageID = ? WHERE userID = ?`).run(message.id, message.author.id);
                if (!client.cooldowns.has(message.author.id)) {
                    client.cooldowns.add(message.author.id);
                    setTimeout(() => {
                        client.cooldowns.delete(message.author.id);
                    }, 15000);
                }
                if (m != "") {
                    m.delete().then(() => msg.react(client.utils.success)).then(() => msg.react(client.utils.failed));
                } else {
                    msg.react(client.utils.success).then(() => msg.react(client.utils.failed));
                }

                const filter = (reaction, user) => ([client.utils.success, client.utils.failed].includes(reaction.emoji.id) || [client.utils.success, client.utils.failed].includes(reaction.emoji.name)) && user.id == message.author.id
                const collector = msg.createReactionCollector({
                    filter,
                    time: 7200000
                });
                collector.on('collect', async (r, ur) => {
                    if (ur.id != message.author.id) return; // for some reason, i cant figure out why but this collection ignores that filter
                    let row = client.db.prepare(`SELECT * FROM currentLevel WHERE userID = ?`).get(message.author.id);
                    if (!row || row.messageID != message.id) return;
                    switch (r.emoji.id || r.emoji.name) {
                        case client.utils.success:
                            if (client.cooldowns.has(message.author.id)) {
                                msg.reactions.removeAll();
                                collector.stop();
                                msg.edit({
                                    content: `<@${message.author.id}>, **You need to wait 15 seconds after the demon is chosen before you can set the percentage.**`,
                                    embeds: []
                                })
                                return setTimeout(() => {
                                    msg.delete();
                                    client.funcs.getRouletteEmbed(message, num, percent, levelInfo, demonChoices, "", listDemon);
                                }, 4000);
                            }
                            if (!client.listDemonList.get(message.author.id)) return;
                            client.funcs.setPercent(message, msg, demonChoices, num, percent, collector, levelInfo, demonChoices, listDemon, levelInfo)
                            //setPercent(msg, easy, medium, hard, insane, extreme, num, percent, collector, levelInfo, demonChoices, listDemonList, listDemon, levelInfo, demonChoices);
                            //collector.stop();
                            break;
                        case client.utils.failed:
                            if (!client.listDemonList.get(message.author.id)) return;
                            await msg.reactions.removeAll();
                            await collector.stop();
                            await msg.edit({
                                embeds: [new MessageEmbed().setTitle(`Are you sure you want to give up on the Demon Roulette?`).setFooter(`You are currently at ${percent}%`)]
                            })
                            await msg.react(client.utils.success)
                            await msg.react(client.utils.cross);
                            const giveUpFilter = (rew, usr) => ([client.utils.success, client.utils.cross].includes(rew.emoji.id) || [client.utils.success, client.utils.cross].includes(rew.emoji.name)) && usr.id == message.author.id
                            const giveUpCollector = msg.createReactionCollector({
                                giveUpFilter,
                                time: 7200000
                            });
                            giveUpCollector.on('collect', (reaction, user) => {
                                if (user.id != message.author.id) return; // for some reason, i cant figure out why but this collection ignores that filter
                                switch (reaction.emoji.id || reaction.emoji.name) {
                                    case client.utils.success:
                                        let demonStr = "";
                                        for (i = 0; i < demonChoices.length; i++) {
                                            if (i == (demonChoices.length - 1)) {
                                                demonStr += demonChoices[i];
                                            } else demonStr += (demonChoices[i] + ", ");
                                        }
                                        if (!client.db.prepare(`SELECT inRoulette FROM profiles WHERE userID = ?`).pluck().get(message.author.id)) return;
                                        msg.reactions.removeAll();
                                        giveUpCollector.stop();
                                        if (client.guilds.cache.has(client.utils.guildID)) {
                                            client.guilds.cache.get(client.utils.guildID).channels.cache.get(client.utils.channels.roulette).send({
                                                embeds: [new MessageEmbed()
                                                    .setAuthor('Failed', message.author.displayAvatarURL())
                                                    .setDescription(`**${message.author.tag}** has given up on the Demon Roulette...\n● **Total Demons Completed:** ${num - 1}\n● Reached to **${percent}%**\n● **Last Demon:** ${levelInfo[1]} by ${levelInfo[2]}\n● **Rating:** ${client.libs.mainLib.getDemonDiff(levelInfo[3])}\n\n● **Demons Selected:** ${demonStr}`)
                                                    .setColor(0xff0000)
                                                    .setFooter(`Guild: ${message.guild.name}`).setTimestamp()
                                                ]
                                            });
                                        }
                                        msg.edit({
                                            embeds: [new MessageEmbed()
                                                .setAuthor(`FAILED`, message.author.displayAvatarURL())
                                                .setColor(0xff0000)
                                                .setDescription(`● **Total demons completed:** ${num - 1}\n● Reached to **${percent}%**\n● **Last Demon:** ${levelInfo[1]} by ${levelInfo[2]}\n● **Rating:** ${client.libs.mainLib.getDemonDiff(levelInfo[3])}`)
                                                .setThumbnail(client.utils.images.x)
                                                .setTimestamp()
                                            ]
                                        });
                                        client.listDemonList.delete(message.author.id);
                                        client.db.prepare(`UPDATE profiles SET inRoulette = 0 WHERE userID = ?`).run(message.author.id);
                                        client.db.prepare(`DELETE FROM currentLevel WHERE userID = ?`).run(message.author.id);
                                        break;
                                    case client.utils.cross:
                                        msg.reactions.removeAll();
                                        giveUpCollector.stop();
                                        client.funcs.getRouletteEmbed(message, num, percent, levelInfo, demonChoices, msg, listDemon);
                                        break;
                                }
                            });
                            break;
                    }
                });

            });
        } catch (e) {
            client.funcs.receiveError(message, e);
        }
    },

    completeRoulette: function (message, m, mm, array) {
        try {
            let demonStr = "";
            let row = client.db.prepare(`SELECT * FROM currentLevel WHERE userID = ?`).get(message.author.id);
            for (i = 0; i < array.length; i++) {
                if (i == (array.length - 1)) {
                    demonStr += array[i];
                } else demonStr += (array[i] + ", ");
            }
            client.db.prepare(`UPDATE profiles SET recentDemonStr = ? WHERE userID = ?`).run(demonStr, message.author.id);
            if (mm != "") mm.delete();
            if (client.guilds.cache.has(client.utils.guildID)) {
                client.guilds.cache.get(client.utils.guildID).channels.cache.get(client.utils.channels.roulette).send({
                    embeds: [new MessageEmbed()
                        .setAuthor('Complete!', message.author.displayAvatarURL())
                        .setColor(0x00ff00)
                        .setDescription(`**${message.author.tag}** has successfully completed the Demon Roulette!
    ● **Total Demons:** ${row.demonNum}
    ● **Last Demon:** ${row.levelName} by ${row.levelAuthor}
    ● **Rating:** ${client.libs.mainLib.getDemonDiff(row.demonDiff)}
                        
    ● **Demons Selected:** ${demonStr}`)
                        .setFooter(`Guild: ${message.guild.name}`).setTimestamp()
                    ]
                });
            }
            if (m != "") {
                m.edit({
                    embeds: [new MessageEmbed()
                        .setAuthor(`Congratulations!`, message.author.displayAvatarURL())
                        .setDescription(`You have completed the **__Geometry Dash Demon Roulette!__** :tada:
● **Total Demons:** ${row.demonNum}
● **Last Demon:** ${row.levelName} by ${row.levelAuthor}
● **Rating:** ${client.libs.mainLib.getDemonDiff(row.demonDiff)}
                    
● **Demons Selected:** ${demonStr}`)
                        .setColor(0x00ff00)
                        .setThumbnail('https://i.imgur.com/wRLBw23.png')
                        .setTimestamp()]
                });
                client.listDemonList.delete(message.author.id);
                client.db.prepare(`UPDATE profiles SET completedRoulette = completedRoulette + 1, recentPercentage = 100, inRoulette = 0 WHERE userID = ?`).run(message.author.id);
            } else {
                message.channel.send({
                    embeds: [new MessageEmbed()
                        .setAuthor(`Congratulations!`, message.author.displayAvatarURL())
                        .setDescription(`You have completed the **__Geometry Dash Demon Roulette!__** :tada:
● **Total Demons:** ${row.demonNum}
● **Last Demon:** ${row.levelName} by ${row.levelAuthor}
● **Rating:** ${client.libs.mainLib.getDemonDiff(row.demonDiff)}
                    
● **Demons Selected:** ${demonStr}`)
                        .setColor(0x00ff00)
                        .setThumbnail('https://i.imgur.com/wRLBw23.png')
                        .setTimestamp()]
                });
                client.listDemonList.delete(message.author.id);
                client.db.prepare(`UPDATE profiles SET completedRoulette = completedRoulette + 1, recentPercentage = 100, inRoulette = 0 WHERE userID = ?`).run(message.author.id);;
                client.db.prepare(`DELETE FROM currentLevel WHERE userID = ?`).run(message.author.id);
            }
        } catch (e) {
            client.funcs.receiveError(message, e);
        }
    },

    setPercent: function (message, m, demonChoices, num, percent, collector, info, array, listDemon, levelInfo) {
        try {
            m.reactions.removeAll();
            const filter = (ree) => ree.author.id === message.author.id
            message.channel.send(`**Please type what percent you got below.** (Don't include the % symbol, type \`cancel\` if you want to go back)`).then(mm => {
                message.channel.awaitMessages({
                    filter,
                    max: 1
                }).then(collected => {
                    if (collected.first().author.id != message.author.id) return message.channel.send("**ERROR**")
                    let newPercent = collected.first().content;
                    if (newPercent) newPercent = newPercent.toLowerCase()
                    if (isNaN(newPercent) && newPercent != 'cancel' || newPercent > 100 || newPercent < percent) {
                        mm.delete();
                        collected.first().delete();
                        message.channel.send(`That is an invalid response. Please try again.`).then(mm => {
                            setTimeout(function () {
                                mm.delete();
                                client.funcs.setPercent(message, m, demonChoices, num, percent, collector, info, array, listDemon, levelInfo);
                            }, 2500);
                        })
                    } else if (newPercent == 'cancel') {
                        collected.first().delete();
                        mm.delete();
                        return client.funcs.getRouletteEmbed(message, num, percent, levelInfo, demonChoices, m, listDemon);
                    } else if (newPercent == 100) {
                        client.funcs.completeRoulette(message, m, mm, array);
                    } else {
                        collected.first().delete();
                        mm.delete();
                        client.db.prepare(`UPDATE profiles SET recentPercentage = ? WHERE userID = ?`).run(percent, message.author.id);
                        num++;
                        percent = parseInt(newPercent) + 1;
                        collector.stop();
                        m.reactions.removeAll();
                        client.db.prepare(`UPDATE currentLevel SET percentage = ?, demonNum = ? WHERE userID = ?`).run(percent, num, message.author.id);
                        client.funcs.findLevel(message, demonChoices, num, percent, m);
                    }
                });
            });
        } catch (e) {
            client.funcs.receiveError(message, e);
        }
    },
    findLevel: function (message, demonChoices, num, percent, m) {
        try {
            num = parseInt(num);
            percent = parseInt(percent);
            if (!client.listDemonList.get(message.author.id)) {
                const demonConstruct = {
                    usedIDs: [],
                    finished: 0
                }
                client.listDemonList.set(message.author.id, demonConstruct);
            }
            let currentDemonList = client.listDemonList.get(message.author.id);
            const easy = (demonChoices.includes("Easy")) ? 1 : 0,
                medium = (demonChoices.includes("Medium")) ? 1 : 0,
                hard = (demonChoices.includes("Hard")) ? 1 : 0,
                insane = (demonChoices.includes("Insane")) ? 1 : 0,
                extreme = (demonChoices.includes("Extreme")) ? 1 : 0;
            client.libs.requestLib.getLevel(easy, medium, hard, insane, extreme, demonChoices, function (levelInfo) {
                let demonStr = demonChoices.map(x => `${x}`).join(", ");
                if (currentDemonList.usedIDs.includes(levelInfo[0])) {
                    client.funcs.findLevel(message, demonChoices, num, percent, m);
                } else {
                    const row = client.db.prepare(`SELECT * FROM profiles WHERE userID = ?`).get(message.author.id);
                    if (!row) {
                        client.db.prepare(`INSERT INTO profiles (userID, completedRoulette, rouletteNumber, recentPercentage, recentDemonStr) VALUES (?, ?, ?, ?, ?)`).run(message.author.id, 0, 1, 0, "");
                    } else {
                        currentDemonList.usedIDs.push(levelInfo[0]);
                        let newRow = client.db.prepare('SELECT * FROM currentLevel WHERE userID = ?').get(message.author.id);
                        if (!newRow) {
                            client.db.prepare(`INSERT INTO currentLevel (levelID, levelName, levelAuthor, demonDiff, demonStr, levelFeatured, levelEpic, userID, messageID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(levelInfo[0], levelInfo[1], levelInfo[2], levelInfo[3], demonStr, levelInfo[4], levelInfo[5], message.author.id, "");
                        } else {
                            client.db.prepare(`UPDATE currentLevel SET levelID = @lvlid, levelName = @lvlname, levelAuthor = @author, demonDiff = @diff, demonStr = @str, levelFeatured = @featured, levelEpic = @epic WHERE userID = @userid`).run({
                                lvlid: levelInfo[0],
                                lvlname: levelInfo[1],
                                author: levelInfo[2],
                                diff: parseInt(levelInfo[3]),
                                str: demonStr,
                                featured: parseInt(levelInfo[4]),
                                epic: parseInt(levelInfo[5]),
                                userid: message.author.id
                            });
                        }
                        client.libs.requestLib.getPointercrateDemon(levelInfo, function (listDemon) {
                            if (!currentDemonList.finished) {
                                // currentDemonList isnt required, what
                                client.funcs.getRouletteEmbed(message, num, percent, levelInfo, demonChoices, m, listDemon);
                            } else return `${easy}, ${medium}, ${hard}, ${insane}, ${extreme}, ${levelInfo}, ${demonChoices}, ${listDemon}`;
                        });
                    }
                }
            });
        } catch (e) {
            client.funcs.receiveError(message, e);
        }
    }
};
["commandHandler", "eventHandler"].forEach(handler => {
    require(`./external/${handler}`)(client);
});

client.login(client.config.token);