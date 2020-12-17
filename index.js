const { Discord, Client, MessageEmbed, Permissions, Collection} = require('discord.js');
const bot = new Client();

const config = require('./config.json');
const utils = require('./data/utils.json');
const requestLib = require('./libs/requestLib');
const mainLib = require('./libs/mainLib');

const request = require('request');
const db = require('better-sqlite3')('database.sqlite');
var row;
var insert;
var update;
var del;

var listDemonList = new Map();
var stopped = 0;
var finished = 0;

var cooldowns = new Set();

const perms = new Permissions([
    'MANAGE_MESSAGES',
    'ADD_REACTIONS',
    'USE_EXTERNAL_EMOJIS'
]);

config.prefix = config.prefix.toLowerCase();

bot.login(config.token);

bot.on('rateLimit', (rateLimitInfo) => {
});

bot.on('ready', () => {
    console.log('Connecting to Geometry Dash servers...');
    request.get({url: "http://www.boomlings.com/database"}, function (err, response, body) {
        if (err) return console.error(`ERROR: Failed to access Geometry Dash servers.\n${err}`);
    });
    console.log('Connected!');
    bot.user.setPresence({ activity: {name: `roulette in ${bot.guilds.cache.size} servers... (${config.prefix}help)`}, status: 'online'});
    console.log('Bot ready!');
});

bot.on('guildCreate', guild => {
    bot.guilds.cache.get(utils.guildID).channels.cache.get(utils.channels.guild).send({
        embed: new MessageEmbed()
        .setTitle('Guild Added')
        .setDescription(`Geometry Dash Demon Roulettes are now going on in **${guild.name}**!`)
        .setFooter(`Member Count: ${guild.memberCount}`).setTimestamp()
        .setColor(0x00ff00)
    });
});

bot.on('guildDelete', guild => {
    bot.guilds.cache.get(utils.guildID).channels.cache.get(utils.channels.guild).send({
        embed: new MessageEmbed()
        .setTitle('Guild Removed')
        .setDescription(`Geometry Dash Demon Roulette has been removed from **${guild.name}**...`)
        .setTimestamp()
        .setColor(0xff0000)
    });
});

bot.on('message', async message => {
    if (message.author.bot || message.channel.type == 'dm' || !message.content.startsWith(config.prefix)) return;

    let command = message.content.toLowerCase();
    if (message.content.startsWith(config.prefix)) {
        command = command.split(" ")[0];
        command = command.slice(config.prefix.length);
    }
    
    let args = message.content.split(" ").slice(1);
    bot.user.setPresence({ activity: {name: `roulette in ${bot.guilds.cache.size} servers... (${config.prefix}help)`}, status: 'online'});

    function receiveError(e) {
        if (!perms.has(['MANAGE_MESSAGES', 'ADD_REACTIONS', 'USE_EXTERNAL_EMOJIS'])) {
            message.author.send({
                embed: new MessageEmbed()
                .setAuthor('An error has occured.', utils.images.x)
                .setDescription(`Error: \`\`\`${e}\`\`\`Please try the command again. If the error persists, DM **${utils.ownerTags.flox}** with a link or screenshot of this message, or go to the official support server. (To find server, type \`${config.prefix}server\`).`)
                .setColor(0xff0000)
                .setTimestamp()
            });
        } else message.channel.send({
            embed: new MessageEmbed()
            .setAuthor('An error has occured.', utils.images.x)
            .setDescription(`Error: \`\`\`${e}\`\`\`Please try the command again. If the error persists, DM **${utils.ownerTags.flox}** with a link or screenshot of this message, or go to the official support server. (To find server, type \`${config.prefix}server\`).`)
            .setColor(0xff0000)
            .setTimestamp()
        });
        bot.guilds.cache.get(utils.guildID).channels.cache.get(utils.channels.errors).send({
            embed: new MessageEmbed()
            .setAuthor(`An error has occured.`, utils.images.x)
            .setDescription(`Error: \`\`\`${e.stack}\`\`\``)
            .setColor(0xff0000)
            .setFooter(`Caused by ${message.author.tag} in ${message.guild.name}`).setTimestamp()
        });
        console.log(`Error from ${message.author.tag} in ${message.guild.name}. Error message: ${e.stack}`);
        return;
    }

    let findLevel = function (easy, medium, hard, insane, extreme, num, percent, m, listDemonList) {
        try {
        num = parseInt(num);
        percent = parseInt(percent);
        let demonChoices = [];
        if (easy == 1) demonChoices.push("Easy");
        if (medium == 1) demonChoices.push("Medium");
        if (hard == 1) demonChoices.push("Hard");
        if (insane == 1) demonChoices.push("Insane");
        if (extreme == 1) demonChoices.push("Extreme");
        if (!listDemonList.get(message.author.id)) {
            var demonConstruct = {
                usedIDs: []
            }
            listDemonList.set(message.author.id, demonConstruct);
        }
        var currentDemonList = listDemonList.get(message.author.id);
        requestLib.getLevel(easy, medium, hard, insane, extreme, demonChoices, function(levelInfo) {
            let demonStr = demonChoices.map(x=>`${x}`).join(", ");
            if (currentDemonList.usedIDs.includes(levelInfo[0])) {
                findLevel(easy, medium, hard, insane, extreme, num, percent, m, listDemonList);
            }
            else {
                row = db.prepare(`SELECT * FROM profiles WHERE userID = ?`).get(message.author.id);
                if (!row || row == undefined) {
                    insert = db.prepare(`INSERT INTO profiles (userID, completedRoulette, rouletteNumber, recentPercentage, recentDemonStr) VALUES (?, ?, ?, ?, ?)`);
                    insert.run(message.author.id, 0, 1, 0, "");
                } else {
                currentDemonList.usedIDs.push(levelInfo[0]);
                let newRow = db.prepare('SELECT * FROM currentLevel WHERE userID = ?').get(message.author.id);
                if (!newRow) {
                    insert = db.prepare(`INSERT INTO currentLevel (levelID, levelName, levelAuthor, demonDiff, demonStr, levelFeatured, levelEpic, userID, messageID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(levelInfo[0], levelInfo[1], levelInfo[2], levelInfo[3], demonStr, levelInfo[4], levelInfo[5], message.author.id, "");
                } else update = db.prepare(`UPDATE currentLevel SET levelID = @lvlid, levelName = @lvlname, levelAuthor = @author, demonDiff = @diff, demonStr = @str, levelFeatured = @featured, levelEpic = @epic WHERE userID = @userid`).run({
                    lvlid: levelInfo[0], lvlname: levelInfo[1], author: levelInfo[2], diff: parseInt(levelInfo[3]), str: demonStr, featured: parseInt(levelInfo[4]), epic: parseInt(levelInfo[5]), userid: message.author.id});
            requestLib.getPointercrateDemon(levelInfo, function(listDemon) {
                if (finished == 0) {  
                getRouletteEmbed(easy, medium, hard, insane, extreme, num, percent, levelInfo, demonChoices, m, listDemonList, listDemon, setPercent);
                } else return `${easy}, ${medium}, ${hard}, ${insane}, ${extreme}, ${levelInfo}, ${demonChoices}, ${listDemonList}, ${listDemon}`;
        });
    }
    }
        });
    } catch (e) {
        receiveError(e);
    }
    }

    var setPercent = function (m, easy, medium, hard, insane, extreme, num, percent, collector, info, array, listDemonList, listDemon, levelInfo, demonChoices) {
        try {
        m.reactions.removeAll();
        message.channel.send(`**Please type what percent you got below.** (Don't include the % symbol, type \`cancel\` if you want to go back)`).then(mm=> {
            message.channel.awaitMessages(ree=>ree.author.id === message.author.id, {
                max: 1
            }).then(collected=>{
                let newPercent = collected.first().content;
                if (isNaN(newPercent) && newPercent.toLowerCase() != 'cancel' || newPercent > 100 || newPercent < percent) {
                    mm.delete();
                    collected.first().delete();
                    message.channel.send(`That is an invalid response. Please try again.`).then(mm=>{
                        setTimeout(function(){
                            mm.delete();
                            setPercent(m, easy, medium, hard, insane, extreme, num, percent, collector, info, array, listDemonList, listDemon, levelInfo, demonChoices);
                        }, 2500);
                    })
                } else if (newPercent.toLowerCase() == 'cancel') {
                    collected.first().delete();
                    mm.delete();
                    return getRouletteEmbed(easy, medium, hard, insane, extreme, num, percent, levelInfo, demonChoices, m, listDemonList, listDemon, setPercent);
                } else if (newPercent == 100) {
                    completeRoulette(m, mm, array);
                } else {
                    collected.first().delete();
                    mm.delete();
                    update = db.prepare(`UPDATE profiles SET recentPercentage = ? WHERE userID = ?`);
                    update.run(percent, message.author.id);
                    num++;
                    percent = parseInt(newPercent) + 1;
                    collector.stop();
                    m.reactions.removeAll();
                    update = db.prepare(`UPDATE currentLevel SET percentage = ?, demonNum = ? WHERE userID = ?`).run(percent, num, message.author.id);
                    findLevel(easy, medium, hard, insane, extreme, num, percent, m, listDemonList, message, setPercent);
                }
            });
        });
    } catch (e) {
        receiveError(e);
    }
    }

    function removeCooldown() {
        setTimeout(() => {
            cooldowns.delete(message.author.id);
        }, 15000);
    }

    function getRouletteEmbed(easy, medium, hard, insane, extreme, num, percent, levelInfo, demonChoices, msg, listDemonList, listDemon, setPercent) {
        try {
        message.channel.send({
            embed: new MessageEmbed()
            .setAuthor(`Demon #${num}`, message.author.displayAvatarURL())
            .setDescription(`**__${levelInfo[1]}__ by ${levelInfo[2]}** (${levelInfo[0]})${listDemon}
            
            **Required percent:** ${percent}%`)//0=level_id 1=name 2=author 3=demon_difficulty 4=featured 5=epic (levelInfo arg)
            .setColor(mainLib.getMessageEmbed(levelInfo[3]))
            .setThumbnail(mainLib.getMessageThumbnail(levelInfo[3], levelInfo[4], levelInfo[5]))}).then(mesg=>{
                db.prepare(`UPDATE currentLevel SET messageID = ? WHERE userID = ?`).run(message.id, message.author.id);
            if (!cooldowns.has(message.author.id)) {
                cooldowns.add(message.author.id);
                removeCooldown();
            }
            if (msg != "") msg.delete().then(()=>mesg.react(utils.success)).then(()=>mesg.react(utils.failed));
            else mesg.react(utils.success).then(()=>mesg.react(utils.failed));
            const filterr = (reaction, user) => {
                return [utils.success, utils.failed].includes(reaction.emoji.id) && user.id === message.author.id;
            }
            const collector = mesg.createReactionCollector(filterr, { time: 7200000 }); 
            collector.on('collect', (reaction, user) => {
                row = db.prepare(`SELECT * FROM currentLevel WHERE userID = ?`).get(message.author.id);
                if (row.messageID != message.id || !row) return;
                switch (reaction.emoji.id) {
                    case utils.success:
                        if (cooldowns.has(message.author.id)) {
                            mesg.reactions.removeAll();
                            collector.stop();
                            message.reply("**You need to wait 15 seconds after the demon is chosen before you can set the percentage.**").then(mg=> {
                            return setTimeout(() => {
                                mg.delete();
                                getRouletteEmbed(easy, medium, hard, insane, extreme, num, percent, levelInfo, demonChoices, mesg, listDemonList, listDemon, setPercent);
                            }, 4000);
                        });
                        return;
                        }
                        if (stopped == 1) return;
                        setPercent(mesg, easy, medium, hard, insane, extreme, num, percent, collector, levelInfo, demonChoices, listDemonList, listDemon, levelInfo, demonChoices);
                        collector.stop();
                        break;
                    case utils.failed:
                        if (stopped == 1) return;
                        mesg.reactions.removeAll();
                        collector.stop();
                        mesg.edit({
                            embed: new MessageEmbed().setTitle(`Are you sure you want to give up on the Demon Roulette?`).setFooter(`You are currently at ${percent}%`)
                        }).then(()=>mesg.react(utils.success))
                        .then(()=>mesg.react(utils.cross));
                        const giveUpFilter = (reaction, user) => {
                            return [utils.success, utils.cross].includes(reaction.emoji.id) && user.id === message.author.id;
                        }
                        const giveUpCollector = mesg.createReactionCollector(giveUpFilter);
                        giveUpCollector.on('collect', (reaction, user) => {
                            switch (reaction.emoji.id) {
                                case utils.success:
                                    let demonStr = "";
                                    for (i = 0; i < demonChoices.length; i++) {
                                        if (i == (demonChoices.length - 1)) {
                                            demonStr += demonChoices[i];
                                        } else demonStr += (demonChoices[i] + ", ");
                                    }
                                    row = db.prepare(`SELECT * FROM profiles WHERE userID = ?`).get(message.author.id);
                                    if (row.inRoulette == 0) return;
                                    mesg.reactions.removeAll();
                                    giveUpCollector.stop();
                                    finished = 1;
                                    bot.guilds.cache.get(utils.guildID).channels.cache.get(utils.channels.roulette).send({
                                        embed: new MessageEmbed()
                                        .setAuthor('Failed', message.author.displayAvatarURL())
                                        .setDescription(`**${message.author.tag}** has given up on the Demon Roulette...
● **Total Demons Completed:** ${num - 1}
● Reached to **${percent}%**
● **Last Demon:** ${levelInfo[1]} by ${levelInfo[2]}
● **Rating:** ${mainLib.getDemonDiff(levelInfo[3])}

● **Demons Selected:** ${demonStr}`)
                                        .setColor(0xff0000)
                                        .setFooter(`Guild: ${message.guild.name}`).setTimestamp()
                                    });
                                    mesg.edit(``, {
                                        embed: new MessageEmbed()
                                        .setAuthor(`FAILED`, message.author.displayAvatarURL())
                                        .setColor(0xff0000)
                                        .setDescription(`● **Total demons completed:** ${num - 1}
● Reached to **${percent}%**
● **Last Demon:** ${levelInfo[1]} by ${levelInfo[2]}
● **Rating:** ${mainLib.getDemonDiff(levelInfo[3])}`)
                                        .setThumbnail(utils.images.x)
                                        .setTimestamp()
                                    });
                                    listDemonList.delete(message.author.id);
                                    db.prepare(`UPDATE profiles SET inRoulette = 0 WHERE userID = ?`).run(message.author.id);
                                    db.prepare(`DELETE FROM currentLevel WHERE userID = ?`).run(message.author.id);
                                    break;
                                case utils.cross:
                                    mesg.reactions.removeAll();
                                    giveUpCollector.stop();
                                    getRouletteEmbed(easy, medium, hard, insane, extreme, num, percent, levelInfo, demonChoices, mesg, listDemonList, listDemon, setPercent);
                                    break;
                            }
                        });
                        break;
                }
            });
            
        });
    } catch (e) {
        receiveError(e);
    }
    }

    function completeRoulette(m, mm, array) {
        try {
            let demonStr = "";
            row = db.prepare(`SELECT * FROM currentLevel WHERE userID = ?`).get(message.author.id);
                for (i = 0; i < array.length; i++) {
                    if (i == (array.length - 1)) {
                        demonStr += array[i];
                    } else demonStr += (array[i] + ", ");
                }
                update = db.prepare(`UPDATE profiles SET recentDemonStr = ? WHERE userID = ?`);
                update.run(demonStr, message.author.id);
                if (mm != "") mm.delete();
                
                bot.guilds.cache.get(utils.guildID).channels.cache.get(utils.channels.roulette).send({
                    embed: new MessageEmbed()
                    .setAuthor('Complete!', message.author.displayAvatarURL())
                    .setColor(0x00ff00)
                    .setDescription(`**${message.author.tag}** has successfully completed the Demon Roulette!
● **Total Demons:** ${row.demonNum}
● **Last Demon:** ${row.levelName} by ${row.levelAuthor}
● **Rating:** ${mainLib.getDemonDiff(row.demonDiff)}
                    
● **Demons Selected:** ${demonStr}`)
                    .setFooter(`Guild: ${message.guild.name}`).setTimestamp()
                });

                if (m != "") {
                    m.edit(``, {
                    embed: new MessageEmbed()
                    .setAuthor(`Congratulations!`, message.author.displayAvatarURL())
                    .setDescription(`You have completed the **__Geometry Dash Demon Roulette!__** :tada:
● **Total Demons:** ${row.demonNum}
● **Last Demon:** ${row.levelName} by ${row.levelAuthor}
● **Rating:** ${mainLib.getDemonDiff(row.demonDiff)}
                    
● **Demons Selected:** ${demonStr}`)
                    .setColor(0x00ff00)
                    .setThumbnail('https://i.imgur.com/wRLBw23.png')
                    .setTimestamp()
                });
                listDemonList.delete(message.author.id);
                update = db.prepare(`UPDATE profiles SET completedRoulette = completedRoulette + 1, recentPercentage = 100, inRoulette = 0 WHERE userID = ?`);
                update.run(message.author.id);
            } else {
                message.channel.send(``, {
                    embed: new MessageEmbed()
                    .setAuthor(`Congratulations!`, message.author.displayAvatarURL())
                    .setDescription(`You have completed the **__Geometry Dash Demon Roulette!__** :tada:
● **Total Demons:** ${row.demonNum}
● **Last Demon:** ${row.levelName} by ${row.levelAuthor}
● **Rating:** ${mainLib.getDemonDiff(row.demonDiff)}
                    
● **Demons Selected:** ${demonStr}`)
                    .setColor(0x00ff00)
                    .setThumbnail('https://i.imgur.com/wRLBw23.png')
                    .setTimestamp()
                });
                listDemonList.delete(message.author.id);
                update = db.prepare(`UPDATE profiles SET completedRoulette = completedRoulette + 1, recentPercentage = 100, inRoulette = 0 WHERE userID = ?`);
                del = db.prepare(`DELETE FROM currentLevel WHERE userID = ?`).run(message.author.id);
                update.run(message.author.id);
            }
        } catch (e) {
            receiveError(e);
        }
    }

    if (command == 'ping') {
        try {
        message.channel.send(`:ping_pong:`).then(m=>{
            m.edit(`Pong! Latency: \`${m.createdTimestamp - message.createdTimestamp} ms.\``);
        });
        } catch (e) {
            receiveError(e);
        }
    }

    if (command == 'help') {
        try {
        if (!args[0]) message.channel.send({
            embed: new MessageEmbed()
            .setAuthor('Help Menu', message.author.displayAvatarURL())
            .setDescription(`\`${config.prefix}ping\` - Tests the bot's ping!
\`${config.prefix}help\` - Describes what commands this bot can do!
\`${config.prefix}invite\` - Invite this bot to your own server!
\`${config.prefix}server\` - Join the support server!
\`${config.prefix}about\` - Reveals bot info!
\`${config.prefix}start\` - Starts a Demon Roulette!
\`${config.prefix}stop [yes or y]\` - Force quits a Demon Roulette!
\`${config.prefix}profile [userID or mention]\` - View your profile!
\`${config.prefix}lb, ${config.prefix}leaderboard, ${config.prefix}leaderboards\` - View the completed roulette leaderboard!
\`${config.prefix}suggest <suggestion (fewer than 500 characters)>\` - Suggest something for the bot!
\`${config.prefix}bugreport <report (fewer than 500 characters)>\` - Report any bugs the bot has!
\`${config.prefix}review <bug or suggestion> <ID> <review (fewer than 500 characters)>\` - Review a suggestion! **(bot owners only)**
\`${config.prefix}complete <percentage>\` - Completes a demon in the roulette! (Only use if bot doesn't work properly)
\`${config.prefix}refresh\` - Refreshes the demon you are currently on! (Only use if bot doesn't work properly)`)
            .setColor(message.guild.member(message.author).displayHexColor)
            .setFooter(`Type ${config.prefix}help <command name> to learn more on what each command does.`).setTimestamp()
        });
        else {
        switch (args[0]) {
            case 'ping':
                message.channel.send({
                    embed: new MessageEmbed().setTitle('Ping Command').setDescription('Sends a message that tests the bot\'s response time on Discord.').setFooter(`Usage: ${config.prefix}ping`)
                });
                break;
            case 'help':
                message.channel.send({
                    embed: new MessageEmbed().setTitle('Help Command').setDescription('What you\'re using right now; Sends a message that describes each command the bot can do.').setFooter(`Usage: ${config.prefix}help`)
                });
                break;
            case 'invite':
                message.channel.send({
                    embed: new MessageEmbed().setTitle('Invite Command').setDescription('Sends a link to invite the bot to your server.').setFooter(`Usage: ${config.prefix}invite`)
                });
                break;
                case 'server':
                    message.channel.send({
                        embed: new MessageEmbed().setTitle('Server Command').setDescription('Sends a link to join the support server for the bot.').setFooter(`Usage: ${config.prefix}server`)
                    });
                    break;
            case 'start':
                message.channel.send({
                    embed: new MessageEmbed().setTitle('Start Roulette Command').setDescription('Starts a Demon Roulette by configuring what demons you want to use in it.').setFooter(`Usage: ${config.prefix}start`)
                });
                break;
            case 'profile':
                message.channel.send({
                    embed: new MessageEmbed().setTitle('Profile Command').setDescription('Allows you to check your stats on the bot, such as roulettes you have completed.').setFooter(`Usage: ${config.prefix}profile [userID or mention]`)
                });
                break;
            case 'about':
                message.channel.send({
                    embed: new MessageEmbed().setTitle('About Command').setDescription('Shows some information regarding the bot and what it does. Taken from the description on the website top.gg.').setFooter(`Usage: ${config.prefix}about`)
                });
                break;
            case 'lb':
            case 'leaderboard':
            case 'leaderboards':
                message.channel.send({
                   embed: new MessageEmbed().setTitle('Leaderboard Command').setDescription('Sends a message with the top 10 players in the server with the most demon roulettes completed.').setFooter(`Usage: ${config.prefix}lb, ${config.prefix}leaderboard, ${config.prefix}leaderboards`) 
                });
                break;
            case 'suggest':
                message.channel.send({
                    embed: new MessageEmbed().setTitle('Suggest Command').setDescription('Sends a suggestion to owners that may help benefit the bot. You can only suggest one thing before it gets reviewed.').setFooter(`Usage: ${config.prefix}suggest <suggestion (must be fewer than 500 characters)>`)
                });
                break;
            case 'bugreport':
                message.channel.send({
                    embed: new MessageEmbed().setTitle('Bug Report Command').setDescription('Sends a report to the bot\'s owners to fix any errors or issues that happen with the bot. You should specify exactly what you did to encounter this bug and what it says.').setFooter(`Usage: ${config.prefix}bugreport <report (must be fewer than 500 characters)>`)
                });
                break;
            case 'review':
                message.channel.send({
                    embed: new MessageEmbed().setTitle('Review Command').setDescription('Reviews a suggestion from the bot, and will send a message to the user that originally made the suggestion. **Can only be done by bot owners.**').setFooter(`Usage: ${config.prefix}review <bug or suggestion> <ID> <review (must be fewer than 500 characters)>`)
                });
                break;
            case 'warn':
                message.channel.send({
                    embed: new MessageEmbed().setTitle('Warn Command').setDescription('Warns a user in the bot using the ID and message provided. **Can only be done by bot owners.**').setFooter(`Usage: ${config.prefix}warn <user ID> <warn message>`)
                });
                break;
            case 'stop':
                message.channel.send({
                    embed: new MessageEmbed().setTitle('Stop Command').setDescription('Force quits a demon roulette. Use it only if the bot does something it shouldn\'t do, like say you\'re in a demon roulette when you actually aren\'t. (Say "yes" or "y" after the command to automatically stop)').setFooter(`Usage: ${config.prefix}stop [yes or y]`)
                });
                break;
            case 'refresh':
                message.channel.send({
                    embed: new MessageEmbed().setTitle('Refresh Command').setDescription('Refreshes your current demon roulette. (Only use it if the bot crashes or doesn\'t work properly)').setFooter(`Usage: ${config.prefix}refresh`)
                });
                break;
            case 'complete':
                message.channel.send({
                    embed: new MessageEmbed().setTitle('Complete Command').setDescription('Completes a demon in the roulette with the percentage provided. (Only use it of the bot crashes or doesn\'t work properly').setFooter(`Usage: ${config.prefix}complete <percentage>`)
                });
                break;
        }
    }
} catch (e) {
    receiveError(e);
}
    }

    if (command == 'about') { 
        try {
        message.channel.send({
            embed: new MessageEmbed()
            .setAuthor(`About the Demon Roulette`, message.author.displayAvatarURL())
            .setDescription(`The **Geometry Dash Demon Roulette** is a bot that works with all demons in Geometry Dash. This bot is inspired by the extreme demon roulette that Npesta created. You can check out his video for it [here.](https://www.youtube.com/watch?v=nv_9FkfGRsc)\n\nHere are the rules for how a Demon Roulette works:\n> You will be given a random demon to play. Upon playing it, you must get 1% on it.\n> Once you reach 1%, you will be given a new level. With that level, you'll need to achieve a higher percent than with the previous one.\n> Getting 100% on a level means you completed the challenge, but if you die at a different percent higher than your goal, you'll need to get something higher on the next.\n> Try and get as many demons as you can! The game ends when you can't go any further.\n\nType \`${config.prefix}help\` to see a list of all commands you can use for the bot!`)
            .setFooter(`Taken from top.gg description | Bot Version: v${utils.botVersion}`)
            .setColor(0x66ccff).setTimestamp()
        });
    } catch (e) {
        receiveError(e);
    }
    }

    if (command == 'invite') {
        try {
        message.channel.send(`Use this link to invite the Demon Roulette bot to your server! ${utils.invLink}`);
        } catch (e) {
            receiveError(e);
        }
    }

    if (command == 'server') {
        try {
        message.channel.send(`Use this link to join the support server for the Geometry Dash Demon Roulette! ${utils.serverLink}`);
        } catch (e) {
            receiveError(e);
        }
    }

    if (['lb', 'leaderboard', 'leaderboards'].includes(command)) {
        try {
            let newNewRow = db.prepare(`SELECT * FROM profiles WHERE userID = ?`).get(message.author.id);
            if (!newNewRow || newNewRow == undefined) {
                insert = db.prepare(`INSERT INTO profiles (userID, completedRoulette, rouletteNumber, recentPercentage, recentDemonStr, inRoulette, userTag) VALUES (?, ?, ?, ?, ?, ?, ?)`);
                insert.run(message.author.id, 0, 0, 0, "", 0, message.author.tag);
            }
            if (newNewRow.inRoulette == 1) return message.channel.send(`Sorry, but you can only view leaderboards when you're not in a roulette. Wait until your roulette is finished.`);
            let page = 0;
            row = db.prepare(`SELECT * FROM profiles ORDER BY completedRoulette DESC LIMIT 10 OFFSET ${page * 10}`).all();
            if (!row || row == undefined) {
                insert = db.prepare(`INSERT INTO profiles (userID, completedRoulette, rouletteNumber, recentPercentage, recentDemonStr, inRoulette, userTag) VALUES (?, ?, ?, ?, ?, ?, ?)`);
                insert.run(message.author.id, 0, 0, 0, "", 0, message.author.tag);
            }
            let lbString = [];
            let placement = 0;
            for (let i = 0; i < row.length; i++) {
                placement++;
                if (!message.guild.members.cache.find(x => x.id === row[i].userID)) {
                    placement--;
                    continue;
                };
                lbString.push(`**${placement}.** \`${row[i].userTag}\`\n**Completed Roulettes:** ${row[i].completedRoulette}`);
            }
            if (!lbString) return message.channel.send(`No one in this server has started a Demon Roulette.`);
            message.channel.send({
                embed: new MessageEmbed()
                .setTitle(`<:global_rank:745754626816737331> Demon Roulette Leaderboard`)
                .setDescription(`***__Top 10 users in this server ordered by completed Demon Roulettes__***\n\n${lbString.join("\n\n")}`).setColor(0x00ffcc)
            });
        } catch (e) {
            receiveError(e);
        }
    }

    if (command == 'resetprofile') {
        try {
        if (message.author.id !== utils.ID.owner.flox) {
            if (message.author.id !== utils.ID.owner.joey) return;
        }
        if (!args[0] || isNaN(parseInt(args[0]))) return;
        update = db.prepare(`UPDATE profiles SET completedRoulette = 0, rouletteNumber = 0, recentPercentage = 0, recentDemonStr = ?, inRoulette = 0 WHERE userID = ?`);
        update.run("", args[0]);
        message.delete();
        message.channel.send(`<:success:743975403034509333>`).then(m=>{
            setTimeout(function(){
                m.delete();
            }, 5000);
        });
        return;
    } catch (e) {
        receiveError(e);
    }
    }

    if (command == 'resetcheck') {
        try {
            if (message.author.id !== utils.ID.owner.flox) {
                if (message.author.id !== utils.ID.owner.joey) return;
            }
        if (!args[0] || isNaN(parseInt(args[0]))) return message.delete();
        update = db.prepare(`UPDATE profiles SET inRoulette = 0 WHERE userID = ?`).run(message.author.id);
        message.delete();
        message.channel.send(`<:success:743975403034509333>`).then(m=>{
            setTimeout(function(){
                m.delete();
            }, 5000);
        });
    } catch (e) {
        receiveError(e);
    }
    }

    if (command == 'warn') {
        try {
            if (message.author.id !== utils.ID.owner.flox) {
                if (message.author.id !== utils.ID.owner.joey) return message.channel.send(`You do not have permission to use this command.`);
            }
        let warnMsg = args.splice(1).join(" ");
        if (!args[0] || isNaN(parseInt(args[0])) || !warnMsg) return message.channel.send({
            embed: new MessageEmbed().setAuthor(`Invalid Syntax`, message.author.displayAvatarURL()).setDescription(`Correct Usage:\n\`${config.prefix}warn <user ID> <warn message>\``).setColor(0xff0000).setTimestamp()
        });
        row = db.prepare(`SELECT * FROM profiles WHERE userID = ?`).get(args[0]);
        if (!row) return message.channel.send(`Either that user doesn't exist, or they haven't played in the Demon Roulette. Please try again.`);
        bot.users.cache.get(args[0]).send({
            embed: new MessageEmbed()
            .setAuthor(`Warn`, message.author.displayAvatarURL())
            .setDescription(`You have been warned from using the Demon Roulette bot by **${message.author.tag}**.\n**Reason:** ${warnMsg}`)
            .setColor(0xff0000).setTimestamp()
        });
        message.channel.send(`<:success:743975403034509333> ${bot.users.cache.get(args[0]).tag} has been warned.`);
    } catch (e) {
        receiveError(e);
    }
    }

    if (command == 'profile') {
        try {
        let mentionUser = message.mentions.users.first();
        if (mentionUser) {
            row = db.prepare(`SELECT * FROM profiles WHERE userID = ?`).get(mentionUser.id);
            if (!row || row == undefined) {
                return message.channel.send(`Either that user doesn't exist, or they haven't played in the Demon Roulette. Please try again.`);
            } else {
                let newNewRow = db.prepare(`SELECT * FROM profiles WHERE userID = ?`).get(message.author.id);
                if (!newNewRow) {
                    insert = db.prepare(`INSERT INTO profiles (userID, completedRoulette, rouletteNumber, recentPercentage, recentDemonStr, inRoulette, userTag) VALUES (?, ?, ?, ?, ?, ?, ?)`);
                    insert.run(message.author.id, 0, 0, 0, "", 0, message.author.tag);
                    newNewRow = db.prepare(`SELECT * FROM profiles WHERE userID = ?`).get(message.author.id);
                }
                if (newNewRow.inRoulette == 1) return message.channel.send(`Sorry, but you can only view profiles when you're not in a roulette. Wait until your roulette is finished.`);
                let newDemonChoi = row.recentDemonStr;
                if (newDemonChoi == "" || !newDemonChoi) newDemonChoi = "*None*";
                stopped = 0;
                message.channel.send({
                    embed: new MessageEmbed()
                    .setAuthor(`${mentionUser.username}'s Profile`, mentionUser.displayAvatarURL())
                    .setDescription(`● **Total Roulettes:** ${row.rouletteNumber}
● **Completed Roulettes:** ${row.completedRoulette}
● **Most Recent Percentage:** ${row.recentPercentage}
● **Most Recent Demon Choice(s):** ${newDemonChoi}`)
                    .setColor(message.guild.member(mentionUser).displayHexColor)
                    .setFooter(`User ID: ${mentionUser.id}`).setTimestamp()
                });
            }
        } else if (!isNaN(args[0])) {
            row = db.prepare(`SELECT * FROM profiles WHERE userID = ?`).get(args[0]);
            if (!row || row == undefined) {
                return message.channel.send(`Either that user doesn't exist, or they haven't played in the Demon Roulette. Please try again.`);
            } else {
                let newRow = db.prepare(`SELECT * FROM profiles WHERE userID = ?`).get(message.author.id);
                if (!newRow || newRow == undefined) {
                    insert = db.prepare(`INSERT INTO profiles (userID, completedRoulette, rouletteNumber, recentPercentage, recentDemonStr, inRoulette, userTag) VALUES (?, ?, ?, ?, ?, ?, ?)`);
                    insert.run(message.author.id, 0, 0, 0, "", 0, message.author.tag);
                }
                if (newRow.inRoulette == 1) return message.channel.send(`Sorry, but you can only view profiles when you're not in a roulette. Wait until your roulette is finished.`);
                let guild = bot.guilds.cache.get(message.guild.id);
                let memberNam = guild.members.cache.get(args[0]);
                let newDemonChoic = row.recentDemonStr;
                if (newDemonChoic == "" || !newDemonChoic) newDemonChoic = "*None*";
                message.channel.send({
                    embed: new MessageEmbed()
                    .setAuthor(`${memberNam.user.username}'s Profile`, memberNam.user.displayAvatarURL())
                    .setDescription(`● **Total Roulettes:** ${row.rouletteNumber}
● **Completed Roulettes:** ${row.completedRoulette}
● **Most Recent Percentage:** ${row.recentPercentage}%
● **Most Recent Demon Choice(s):** ${newDemonChoic}`)
                    .setColor(message.guild.member(memberNam).displayHexColor)
                    .setFooter(`User ID: ${memberNam.user.id}`).setTimestamp()
                });
            }
        } else {
            row = db.prepare(`SELECT * FROM profiles WHERE userID = ?`).get(message.author.id);
            if (!row || row == undefined) {
                insert = db.prepare(`INSERT INTO profiles (userID, completedRoulette, rouletteNumber, recentPercentage, recentDemonStr, inRoulette, userTag) VALUES (?, ?, ?, ?, ?, ?, ?)`);
                insert.run(message.author.id, 0, 0, 0, "", 0, message.author.tag);
            } else {
                if (row.inRoulette == 1) return message.channel.send(`Sorry, but you can only view profiles when you're not in a roulette. Wait until your roulette is finished.`);
                let demonChoic = row.recentDemonStr;
                if (demonChoic == "" || !demonChoic) demonChoic = "*None*";
            message.channel.send({
                embed: new MessageEmbed()
                .setAuthor(`${message.author.username}'s Profile`, message.author.displayAvatarURL())
                .setDescription(`● **Total Roulettes: ** ${row.rouletteNumber}
● **Completed Roulettes:** ${row.completedRoulette}
● **Most Recent Percentage:** ${row.recentPercentage}%
● **Most Recent Demon Choice(s):** ${demonChoic}`)
                .setColor(message.guild.member(message.author).displayHexColor)
                .setFooter(`User ID: ${message.author.id}`).setTimestamp()
            });
        }
    }
} catch (e) {
        receiveError(e);
    }
}

    if  (command == 'suggest') {
        try {
        row = db.prepare(`SELECT * FROM suggestions WHERE userID = ? ORDER BY suggestID DESC LIMIT 1`).get(message.author.id);
        if (row) {
        if (row.isReviewed == 0) return message.channel.send(`You can only suggest one thing at a time. Please wait until your previous suggestion as been reviewed before you suggest something else.`);
        }
        let suggestion = args.splice(0).join(" ");
        if (!suggestion || suggestion.length > 500) return message.channel.send({
            embed: new MessageEmbed().setAuthor(`Invalid Syntax`, message.author.displayAvatarURL()).setDescription(`Correct Usage:\n\`${config.prefix}suggest <suggestion (must be fewer than 500 characters)>\``).setColor(0xff0000).setTimestamp()
        });        
        insert = db.prepare(`INSERT INTO suggestions (userID, suggestion, isReviewed) VALUES (?, ?, ?)`).run(message.author.id, Buffer.from(suggestion).toString('base64'), 0);
        let suggestRow = db.prepare(`SELECT suggestID FROM suggestions WHERE userID = ? ORDER BY suggestID DESC LIMIT 1`).get(message.author.id);
        bot.guilds.cache.get(utils.guildID).channels.cache.get(utils.channels.suggestions).send({
            embed: new MessageEmbed()
            .setAuthor(`New Suggestion`, message.author.displayAvatarURL())
            .setDescription(`**Suggestion:** ${suggestion}`)
            .setColor(0xff99ff).setTimestamp()
            .setFooter(`ID: ${suggestRow.suggestID}`)
        });
        message.channel.send(`<:success:743975403034509333> Suggestion added!`);
    } catch (e) {
        receiveError(e);
    }
    }

    if (command == 'bugreport') {
        try {
        row = db.prepare(`SELECT * FROM bugs WHERE userID = ? ORDER BY bugID DESC LIMIT 1`).get(message.author.id);
        if (row) {
        if (row.isReviewed == 0) return message.reply(`You can only report one bug at a time. Please wait until your previous report has been reviewed before you report something else.`);
        }
        let report = args.splice(0).join(" ");
        if (!report || report.length > 500) return message.channel.send({
            embed: new MessageEmbed().setAuthor(`Invalid Syntax`, message.author.displayAvatarURL()).setDescription(`Correct Usage:\n\`${config.prefix}bugreport <bug (must be fewer than 500 characters)>\``).setColor(0xff0000).setTimestamp()
        });
        insert = db.prepare(`INSERT INTO bugs (userID, bugReport, isReviewed) VALUES (?, ?, ?)`).run(message.author.id, Buffer.from(report).toString('base64'), 0);
        let bugRow = db.prepare(`SELECT bugID FROM bugs WHERE userID = ? ORDER BY bugID DESC LIMIT 1`).get(message.author.id);
        bot.guilds.cache.get(utils.guildID).channels.cache.get(utils.channels.bugs).send({
            embed: new MessageEmbed()
            .setAuthor(`New Bug Report`, message.author.displayAvatarURL())
            .setDescription(`**Bug:** ${report}`)
            .setColor(0x99ccff).setTimestamp()
            .setFooter(`ID: ${bugRow.bugID}`)
        });
        message.channel.send(`<:success:743975403034509333> Bug reported!`);
    } catch (e) {
        receiveError(e);
    }
    }

    if (command == 'review') {
        try {
            if (message.author.id !== utils.ID.owner.flox) { 
                if (message.author.id !== utils.ID.owner.joey) return message.channel.send(`You do not have permission to use this command.`);
            }
        let review = args.splice(2).join(" ");
        if (!args[0] || !['suggestion', 'bug', 's', 'b'].includes(args[0]) || !args[1] || isNaN(parseInt(args[1])) || !review || review.length > 500) return message.channel.send({
            embed: new MessageEmbed().setAuthor(`Invalid Syntax`, message.author.displayAvatarURL()).setDescription(`Correct Usage:\n\`${config.prefix}review <suggestion or bug> <ID> <review (must be fewer than 500 characters)>\``).setColor(0xff0000).setTimestamp()
        });
        switch (args[0]) {
        case 'suggestion':
        case 's': 
        row = db.prepare(`SELECT * FROM suggestions WHERE suggestID = ?`).get(args[1]);
        if (!row) return message.channel.send(`Sorry, but that suggestion ID doesn't exist.`);
        if (row.isReviewed == 1) return message.channel.send(`Sorry, but that suggestion has already been reviewed.`);
        bot.guilds.cache.get(utils.guildID).channels.cache.get(utils.channels.suggestions).send({
            embed: new MessageEmbed()
            .setAuthor(`Suggestion Reviewed`, message.author.displayAvatarURL())
            .setDescription(`**Original Suggestion:** ${Buffer.from(row.suggestion, 'base64').toString()}\n**Review:** ${review}`)
            .setColor(0xff9966).setTimestamp()
            .setFooter(`Reviewed by ${message.author.tag}`)
        });
        bot.users.cache.get(row.userID).send({
            embed: new MessageEmbed()
            .setAuthor(`Suggestion Reviewed`, message.author.displayAvatarURL())
            .setDescription(`Your most recent suggestion for the bot has been reviewed by **${message.author.tag}!**\n\n**Original Suggestion:** ${Buffer.from(row.suggestion, 'base64').toString()}\n**Review:** ${review}`)
            .setColor(0xff9966).setTimestamp()
        });
        update = db.prepare(`UPDATE suggestions SET isReviewed = 1 WHERE suggestID = ?`).run(args[1]);
        message.channel.send(`<:success:743975403034509333> Suggestion reviewed!`);
        return;
        case 'bug':
        case 'b':
            row = db.prepare(`SELECT * FROM bugs WHERE bugID = ?`).get(args[1]);
            if (!row) return message.channel.send(`Sorry, but that bug report ID doesn't exist.`);
            if (row.isReviewed == 1) return message.channel.send(`Sorry, but that bug report has already been reviewed.`);
            bot.guilds.cache.get(utils.guildID).channels.cache.get(utils.channels.bugs).send({
                embed: new MessageEmbed()
                .setAuthor(`Bug Report Reviewed`, message.author.displayAvatarURL())
                .setDescription(`**Original Bug Report:** ${Buffer.from(row.bugReport, 'base64').toString()}\n**Review:** ${review}`)
                .setColor(0x66ff66).setTimestamp()
                .setFooter(`Reviewed by ${message.author.tag}`)
            });
            bot.users.cache.get(row.userID).send({
                embed: new MessageEmbed()
                .setAuthor(`Bug Report Reviewed`, message.author.displayAvatarURL())
                .setDescription(`Your most recent bug report for the bot has been reviewed by **${message.author.tag}!**\n\n**Original Report:** ${Buffer.from(row.bugReport, 'base64').toString()}\n**Review:** ${review}`)
                .setColor(0x66ff66).setTimestamp()
            });
            update = db.prepare(`UPDATE bugs SET isReviewed = 1 WHERE bugID = ?`).run(args[1]);
            message.channel.send(`<:success:743975403034509333> Bug reviewed!`);
    }
} catch (e) {
    receiveError(e);
}
    }

    if (command == 'start') {
        try {
        if (!perms.has('MANAGE_MESSAGES') || !perms.has('ADD_REACTIONS') || !perms.has('USE_EXTERNAL_EMOJIS')) {
            let msgPerm = perms.has('MANAGE_MESSAGES');
            let reactPerm = perms.has('ADD_REACTIONS');
            let extPerm = perms.has('USE_EXTERNAL_EMOJIS');
            return message.channel.send({
            embed: new MessageEmbed()
            .setAuthor('Missing Permissions', message.author.displayAvatarURL())
            .setColor(0xff0000)
            .setDescription(`The bot needs these permissions in this server before starting a roulette:${'\n\`MANAGE_MESSAGES\`' ? msgPerm : ""}${'\n\`ADD_REACTIONS\`' ? reactPerm : ""}${'\n\`USE_EXTERNAL_EMOJIS\`' ? extPerm : ""}`)
            .setTimestamp()
        });
    }
        const userQuery = db.prepare(`SELECT * FROM profiles WHERE userID = ?`)
        let user = await userQuery.get(message.author.id)
        if (!user) {
            await db.prepare(`INSERT INTO profiles (userID, completedRoulette, rouletteNumber, recentPercentage, recentDemonStr, inRoulette, userTag) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(message.author.id, 0, 0, 0, "", 0, message.author.tag);
            user = await userQuery.get(message.author.id)
        }
        if (user.inRoulette) return message.channel.send({
            embed: new MessageEmbed()
            .setAuthor(`Error`, message.author.displayAvatarURL())
            .setDescription(`You are already in a demon roulette.
If you believe this is incorrect:
● \`${config.prefix}stop\` - Ends the roulette you're currently in
● \`${config.prefix}refresh\` - Refreshes your roulette in the current channel
● \`${config.prefix}complete <percentage>\` - Completes the demon you're currently on`)
            .setColor(0xff0000)
        });
        await db.prepare(`UPDATE profiles SET inRoulette = 1 WHERE userID = ?`).run(message.author.id);
        let easyDemon = 0;
        let mediumDemon = 0;
        let hardDemon = 0;
        let insaneDemon = 0;
        let extremeDemon = 0;
        let demonStr = "None";
        stopped = 0;
        finished = 0;
            await message.channel.send({
                embed: new MessageEmbed()
                .setAuthor(`You have successfully started a demon roulette!`, message.author.displayAvatarURL())
                .setDescription(`**Rules for the Demon Roulette**
● You will be given a random demon to play. Upon playing it, you must get 1% on it.
● If you reach 1%, react with <:success:743975403034509333>, and you will be given a new level. With that level, you'll need to achieve a higher percent than with the previous level.
● Getting 100% on a level means you completed the challenge, but if you die at a different percent, you'll need to get something higher on the next.
● Try and get as many demons as you can! React with <:failed:744386894418280480> whenever you believe you can't go any further.
                
**Please react to the demon faces below to determine what demons you use in the roulette. When you are ready, react with <:play:744386993395597383> to begin.** (Or react with <:cross:744310641166123188> to stop the roulette.)
                
*Current selections:* ${demonStr}`)
                .setFooter(`Inspired by Npesta's Extreme Demon Roulette`).setTimestamp()
            }).then(async m=>{
                await m.react(utils.cross)
                await m.react(utils.play)
                await m.react(utils.demons.easy)
                await m.react(utils.demons.medium)
                await m.react(utils.demons.hard)
                await m.react(utils.demons.insane)
                await m.react(utils.demons.extreme);
                const filter = (reaction, user) => {
                    return [utils.demons.easy, utils.demons.medium, utils.demons.hard, utils.demons.insane, utils.demons.extreme, utils.play, utils.cross].includes(reaction.emoji.id) && user.id === message.author.id;
                }
                const collector = m.createReactionCollector(filter);
                collector.on('collect', (reaction, user) => {
                    switch (reaction.emoji.id) {
                        case utils.demons.easy:
                            if (easyDemon == 1) {
                                easyDemon = 0;
                                demonStr = demonStr.replace(/<:easydemon:743975176227782787>/g, '');
                                if (!demonStr.length) demonStr = "None";
                            } else {
                            easyDemon = 1;
                            if (demonStr == "None") demonStr = "<:easydemon:743975176227782787>";
                            else demonStr += "<:easydemon:743975176227782787>";
                            }
                            
                            m.edit({
                                embed: new MessageEmbed()
                                .setAuthor(`You have successfully started a demon roulette!`, message.author.displayAvatarURL())
                                .setDescription(`**Rules for the Demon Roulette**
● You will be given a random demon to play. Upon playing it, you must get 1% on it.
● If you reach 1%, react with <:success:743975403034509333>, and you will be given a new level. With that level, you'll need to achieve a higher percent than with the previous level.
● Getting 100% on a level means you completed the challenge, but if you die at a different percent, you'll need to get something higher on the next.
● Try and get as many demons as you can! React with <:failed:744386894418280480> whenever you believe you can't go any further.
                                
**Please react to the demon faces below to determine what demons you use in the roulette. When you are ready, react with <:play:744386993395597383> to begin.** (Or react with <:cross:744310641166123188> to stop the roulette.)
                                
*Current selections:* ${demonStr}`)
                                .setFooter(`Inspired by Npesta's Extreme Demon Roulette`).setTimestamp()
                            });
                            reaction.users.remove(user.id);
                            break;
                            case utils.demons.medium:
                                if (mediumDemon == 1) {
                                    mediumDemon = 0;
                                    demonStr = demonStr.replace(/<:mediumdemon:743975218963546154>/g, '');
                                    if (demonStr == '') demonStr = "None";
                                } else {
                                mediumDemon = 1;
                                if (demonStr == "None") demonStr = "<:mediumdemon:743975218963546154>";
                                else demonStr += "<:mediumdemon:743975218963546154>";
                                }
                                m.edit({
                                    embed: new MessageEmbed()
                                    .setAuthor(`You have successfully started a demon roulette!`, message.author.displayAvatarURL())
                                    .setDescription(`**Rules for the Demon Roulette**
● You will be given a random demon to play. Upon playing it, you must get 1% on it.
● If you reach 1%, react with <:success:743975403034509333>, and you will be given a new level. With that level, you'll need to achieve a higher percent than with the previous level.
● Getting 100% on a level means you completed the challenge, but if you die at a different percent, you'll need to get something higher on the next.
● Try and get as many demons as you can! React with <:failed:744386894418280480> whenever you believe you can't go any further.
                                    
**Please react to the demon faces below to determine what demons you use in the roulette. When you are ready, react with <:play:744386993395597383> to begin.** (Or react with <:cross:744310641166123188> to stop the roulette.)
                                    
*Current selections:* ${demonStr}`)
                                    .setFooter(`Inspired by Npesta's Extreme Demon Roulette`).setTimestamp()
                                });
                                reaction.users.remove(user.id);
                                break;
                                case utils.demons.hard:
                                    if (hardDemon == 1) {
                                        hardDemon = 0;
                                        demonStr = demonStr.replace(/<:harddemon:743975271543210035>/g, '');
                                        if (demonStr == '') demonStr = "None";
                                    } else {
                                    hardDemon = 1;
                                    if (demonStr == "None") demonStr = "<:harddemon:743975271543210035>";
                                    else demonStr += "<:harddemon:743975271543210035>";
                                    }
                                    m.edit({
                                        embed: new MessageEmbed()
                                        .setAuthor(`You have successfully started a demon roulette!`, message.author.displayAvatarURL())
                                        .setDescription(`**Rules for the Demon Roulette**
● You will be given a random demon to play. Upon playing it, you must get 1% on it.
● If you reach 1%, react with <:success:743975403034509333>, and you will be given a new level. With that level, you'll need to achieve a higher percent than with the previous level.
● Getting 100% on a level means you completed the challenge, but if you die at a different percent, you'll need to get something higher on the next.
● Try and get as many demons as you can! React with <:failed:744386894418280480> whenever you believe you can't go any further.
                                        
**Please react to the demon faces below to determine what demons you use in the roulette. When you are ready, react with <:play:744386993395597383> to begin.** (Or react with <:cross:744310641166123188> to stop the roulette.)
                                        
*Current selections:* ${demonStr}`)
                                        .setFooter(`Inspired by Npesta's Extreme Demon Roulette`).setTimestamp()
                                    });
                                    reaction.users.remove(user.id);
                                    break;
                                    case utils.demons.insane:
                                        if (insaneDemon == 1) {
                                            insaneDemon = 0;
                                            demonStr = demonStr.replace(/<:insanedemon:743975326031282246>/g, '');
                                            if (demonStr == '') demonStr = "None";
                                        } else {
                                        insaneDemon = 1;
                                        if (demonStr == "None") demonStr = "<:insanedemon:743975326031282246>";
                                        else demonStr += "<:insanedemon:743975326031282246>";
                                        }
                                        m.edit({
                                            embed: new MessageEmbed()
                                            .setAuthor(`You have successfully started a demon roulette!`, message.author.displayAvatarURL())
                                            .setDescription(`**Rules for the Demon Roulette**
● You will be given a random demon to play. Upon playing it, you must get 1% on it.
● If you reach 1%, react with <:success:743975403034509333>, and you will be given a new level. With that level, you'll need to achieve a higher percent than with the previous level.
● Getting 100% on a level means you completed the challenge, but if you die at a different percent, you'll need to get something higher on the next.
● Try and get as many demons as you can! React with <:failed:744386894418280480> whenever you believe you can't go any further.
                                            
**Please react to the demon faces below to determine what demons you use in the roulette. When you are ready, react with <:play:744386993395597383> to begin.** (Or react with <:cross:744310641166123188> to stop the roulette.)
                                            
*Current selections:* ${demonStr}`)
                                            .setFooter(`Inspired by Npesta's Extreme Demon Roulette`).setTimestamp()
                                        });
                                        reaction.users.remove(user.id);
                                        break;
                                        case utils.demons.extreme:
                                            if (extremeDemon == 1) {
                                                extremeDemon = 0;
                                                demonStr = demonStr.replace(/<:extremedemon:743975367106363483>/g, '');
                                                if (demonStr == '') demonStr = "None";
                                            } else {
                                            extremeDemon = 1;
                                            if (demonStr == "None") demonStr = "<:extremedemon:743975367106363483>";
                                            else demonStr += "<:extremedemon:743975367106363483>";
                                            }
                                            m.edit({
                                                embed: new MessageEmbed()
                                                .setAuthor(`You have successfully started a demon roulette!`, message.author.displayAvatarURL())
                                                .setDescription(`**Rules for the Demon Roulette**
● You will be given a random demon to play. Upon playing it, you must get 1% on it.
● If you reach 1%, react with <:success:743975403034509333>, and you will be given a new level. With that level, you'll need to achieve a higher percent than with the previous level.
● Getting 100% on a level means you completed the challenge, but if you die at a different percent, you'll need to get something higher on the next.
● Try and get as many demons as you can! React with <:failed:744386894418280480> whenever you believe you can't go any further.
                                                
**Please react to the demon faces below to determine what demons you use in the roulette. When you are ready, react with <:play:744386993395597383> to begin.** (Or react with <:cross:744310641166123188> to stop the roulette.)
                                                
*Current selections:* ${demonStr}`)
                                                .setFooter(`Inspired by Npesta's Extreme Demon Roulette`).setTimestamp()
                                            });
                                            reaction.users.remove(user.id);
                                            break;
                                            case utils.play:
                                                reaction.users.remove(user.id);
                                                if (easyDemon == 0 && mediumDemon == 0 && hardDemon == 0 && insaneDemon == 0 && extremeDemon == 0) {
                                                    message.channel.send(`**Please select at least one of the demon difficulties before starting!**`).then(m=>{
                                                        setTimeout(function(){
                                                            m.delete();
                                                        }, 5000);
                                                    });
                                                } else {
                                                m.reactions.removeAll();
                                                let demonNumber = 1;
                                                let percent = 1;
                                                collector.stop();
                                                let newRow = db.prepare(`SELECT * FROM currentLevel WHERE userID = ?`).get(message.author.id);
                                                if (!newRow) {
                                                    insert = db.prepare(`INSERT INTO currentLevel (userID, levelID, levelName, levelAuthor, demonDiff, levelFeatured, levelEpic, percentage, demonNum, easy, medium, hard, insane, extreme, demonStr, messageID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(message.author.id, 0, "", "", 0, 0, 0, 1, 1, easyDemon, mediumDemon, hardDemon, insaneDemon, extremeDemon, "", "");
                                                }
                                                db.prepare(`UPDATE profiles SET rouletteNumber = rouletteNumber + 1 WHERE userID = ?`).run(message.author.id);
                                                findLevel(easyDemon, mediumDemon, hardDemon, insaneDemon, extremeDemon, demonNumber, percent, m, listDemonList);
                                                }
                                                break;
                                                case utils.cross:
                                                    m.delete();
                                                    db.prepare(`UPDATE profiles SET inRoulette = 0 WHERE userID = ?`).run(message.author.id);
                                                    message.reply(`Demon roulette has been cancelled.`).then(mm=>{
                                                    setTimeout(function(){
                                                      mm.delete();  
                                                    }, 5000);
                                                });
                                                collector.stop();
                                                break;
                    }
                });
            });
        } catch (e) {
            receiveError(e);
        }
    }

    if (command == 'stop') {
        try {
        row = db.prepare(`SELECT * FROM profiles WHERE userID = ?`).get(message.author.id);
        if (row.inRoulette == 0) return message.channel.send({
            embed: new MessageEmbed().setTitle(`You are currently not in a Demon Roulette!`)
        });
        if (!args[0]) {
        message.channel.send({
            embed: new MessageEmbed()
            .setTitle(`Are you sure you want to end the Demon Roulette?`)
            .setFooter(`WARNING: This will stop all progress on your current round. You will have to start over if you wish to play again.`)
        }).then(mm=>{
            mm.react(utils.success).then(()=>mm.react(utils.cross));
            const stopFilter = (reaction, user) => {
                return [utils.success, utils.cross].includes(reaction.emoji.id) && user.id === message.author.id;
            }
                const stopCollector = mm.createReactionCollector(stopFilter);
                stopCollector.on('collect', (reaction, user) => {
                    switch (reaction.emoji.id) {
                        case utils.success:
                            mm.reactions.removeAll();
                            update = db.prepare(`UPDATE profiles SET inRoulette = 0 WHERE userID = ?`).run(message.author.id);
                            db.prepare(`DELETE FROM currentLevel WHERE userID = ?`).run(message.author.id);
                            stopped = 1;
                            bot.guilds.cache.get(utils.guildID).channels.cache.get(utils.channels.roulette).send({
                                embed: new MessageEmbed()
                                .setAuthor(`Roulette Stopped`, message.author.displayAvatarURL())
                                .setDescription(`**${message.author.tag}** has decided to force-quit the roulette.`)
                                .setColor(0xff0000)
                                .setFooter(`Guild: ${message.guild.name}`).setTimestamp()
                            });
                            mm.edit({
                                embed: new MessageEmbed().setTitle(`Demon Roulette has been officially stopped by the user.`)
                                .setColor(0xff0000)
                            });
                            break;
                        case utils.cross:
                            mm.delete();
                            message.delete();
                            break;
                    }
                });
        });
    } else if (['yes', 'y'].includes(args[0].toLowerCase())) {
        update = db.prepare(`UPDATE profiles SET inRoulette = 0 WHERE userID = ?`).run(message.author.id);
        db.prepare(`DELETE FROM currentLevel WHERE userID = ?`).run(message.author.id);
        stopped = 1;
        bot.guilds.cache.get(utils.guildID).channels.cache.get(utils.channels.roulette).send({
            embed: new MessageEmbed()
            .setAuthor(`Roulette Stopped`, message.author.displayAvatarURL())
            .setDescription(`**${message.author.tag}** has decided to force-quit the roulette.`)
            .setColor(0xff0000)
            .setFooter(`Guild: ${message.guild.name}`).setTimestamp()
        });
        message.channel.send({
            embed: new MessageEmbed().setTitle(`Demon Roulette has been officially stopped by the user.`)
            .setColor(0xff0000)
        });
    } else return;
    } catch (e) {
        receiveError(e);
    }
    }

    if (command == 'complete') {
        try {
            row = db.prepare(`SELECT * FROM profiles WHERE userID = ?`).get(message.author.id);
            if (row.inRoulette == 0) return message.channel.send(`Sorry, but this command can only be used when you're in a demon roulette. If you want to begin one, type \`${config.prefix}start\`.`);
            if (!args[0] || isNaN(parseInt(args[0])) || args[0] < 1 || args[0] > 100) return message.channel.send({
                embed: new MessageEmbed().setAuthor(`Invalid Syntax`, message.author.displayAvatarURL()).setDescription(`Correct Usage:\n\`${config.prefix}complete <percentage (must be between 1 and 100)>\``).setColor(0xff0000).setTimestamp()
            });
            if (cooldowns.has(message.author.id)) return message.channel.send({
                embed: new MessageEmbed().setAuthor("Error", message.author.displayAvatarURL()).setDescription("You need to wait **15 seconds** after the demon is chosen before you can set the percentage.")
            });            
            if (args[0] == 100) {
                completeRoulette("", "");
            } else {
                let otherRow = db.prepare(`SELECT * FROM currentLevel WHERE userID = ?`).get(message.author.id);
                if (args[0] < otherRow.percentage) return message.channel.send(`That is an invalid percentage. Please try again.`);
                update = db.prepare(`UPDATE currentLevel SET demonNum = demonNum + 1, percentage = ? WHERE userID = ?`).run(parseInt(args[0]) + 1, message.author.id);
                let newRow = db.prepare(`SELECT * FROM currentLevel WHERE userID = ?`).get(message.author.id);
                findLevel(newRow.easy, newRow.medium, newRow.hard, newRow.insane, newRow.extreme, newRow.demonNum, newRow.percentage, "", listDemonList)
            }
        } catch (e) {
            receiveError(e);
        }
    }

    if (command == 'refresh') {
        try {
        row = db.prepare(`SELECT * FROM currentLevel WHERE userID = ?`).get(message.author.id);
        if (!row) return message.reply(`You need to be in a demon roulette to use this command. To begin one, type \`${config.prefix}start\`.`);
        if (cooldowns.has(message.author.id)) return message.channel.send({
            embed: new MessageEmbed().setAuthor("Error", message.author.displayAvatarURL()).setDescription("You need to wait **15 seconds** after the demon is chosen before you can refresh.")
        });
        let infoArray = [row.levelID, row.levelName, row.levelAuthor, row.demonDiff, row.levelFeatured, row.levelEpic];
        requestLib.getPointercrateDemon(infoArray, function(pointercrate) {
        getRouletteEmbed(row.easy, row.medium, row.hard, row.insane, row.extreme, row.demonNum, row.percentage, infoArray, row.demonStr, "", listDemonList, pointercrate, setPercent);
        });
    } catch (e) {
        receiveError(e);
    }
    }
});