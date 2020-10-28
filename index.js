const { Discord, Client, MessageEmbed, Permissions} = require('discord.js');
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

const perms = new Permissions([
    'MANAGE_MESSAGES',
    'ADD_REACTIONS',
    'USE_EXTERNAL_EMOJIS'
]);

bot.login(config.token);


/*process.on('unhandledRejection', (error) => {
    if (error) {
        console.error(`unhandledRejection: ${error.message}`);
    }
});*/

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

    let findLevel = function (easy, medium, hard, insane, extreme, num, percent, m, listDemonList) {
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
            requestLib.getPointercrateDemon(levelInfo, function(listDemon) {
                if (finished == 0) {  
                getRouletteEmbed(easy, medium, hard, insane, extreme, num, percent, levelInfo, demonChoices, m, listDemonList, listDemon, setPercent);
                } else return `${easy}, ${medium}, ${hard}, ${insane}, ${extreme}, ${levelInfo}, ${demonChoices}, ${listDemonList}, ${listDemon}`
        });
    }
    }
        });
    }

    var setPercent = function (m, easy, medium, hard, insane, extreme, num, percent, collector, info, array, listDemonList) {
        m.reactions.removeAll();
        message.reply(`**Please type what percent you got below.** (Don't include the % symbol)`).then(mm=> {
            message.channel.awaitMessages(ree=>ree.author.id === message.author.id, {
                max: 1
            }).then(collected=>{
                let newPercent = parseInt(collected.first().content);
                if (isNaN(newPercent) || newPercent > 100 || newPercent < percent) {
                    mm.delete();
                    collected.first().delete();
                    message.channel.send(`That is an invalid response. Please try again.`).then(mm=>{
                        setTimeout(function(){
                            mm.delete();
                            setPercent(m, easy, medium, hard, insane, extreme, num, percent, collector, info, array, listDemonList);
                        }, 2500);
                    })
                } else if (newPercent == 100) {
                    let demonStr = "";
                    for (i = 0; i < array.length; i++) {
                        if (i == (array.length - 1)) {
                            demonStr += array[i];
                        } else demonStr += (array[i] + ", ");
                    }
                    update = db.prepare(`UPDATE profiles SET recentDemonStr = ? WHERE userID = ?`);
                    update.run(demonStr, message.author.id);
                    mm.delete();
                    collected.first().delete();
                    m.reactions.removeAll();
                    bot.guilds.cache.get(utils.guildID).channels.cache.get(utils.channels.roulette).send({
                        embed: new MessageEmbed()
                        .setAuthor('Complete!', message.author.displayAvatarURL())
                        .setColor(0x00ff00)
                        .setDescription(`**${message.author.tag}** has successfully completed the Demon Roulette!
                        ● **Total Demons:** ${num}
                        ● **Last Demon:** ${info[1]} by ${info[2]}
                        ● **Rating:** ${mainLib.getDemonDiff(info[3])}
                        
                        ● **Demons Selected:** ${demonStr}`)
                        .setTimestamp()
                    });
                    m.edit(``, {
                        embed: new MessageEmbed()
                        .setAuthor(`Congratulations!`, message.author.displayAvatarURL())
                        .setDescription(`You have completed the **__Geometry Dash Demon Roulette!__** :tada:
                        ● **Total Demons:** ${num}
                        ● **Last Demon:** ${info[1]} by ${info[2]}
                        ● **Rating:** ${mainLib.getDemonDiff(info[3])}
                        
                        ● **Demons Selected:** ${demonStr}`)
                        .setColor(0x00ff00)
                        .setThumbnail('https://i.imgur.com/wRLBw23.png')
                        .setTimestamp()
                    });
                    listDemonList.delete(message.author.id);
                    update = db.prepare(`UPDATE profiles SET completedRoulette = completedRoulette + 1, recentPercentage = 100, inRoulette = 0 WHERE userID = ?`);
                    update.run(message.author.id);
                } else {
                    collected.first().delete();
                    mm.delete();
                    update = db.prepare(`UPDATE profiles SET recentPercentage = ? WHERE userID = ?`);
                    update.run(percent, message.author.id);
                    num++;
                    percent = newPercent + 1;
                    collector.stop();
                    m.reactions.removeAll();
                    findLevel(easy, medium, hard, insane, extreme, num, percent, m, listDemonList, message, setPercent);
                }
            });
        });
    }

    async function getRouletteEmbed(easy, medium, hard, insane, extreme, num, percent, levelInfo, demonChoices, mesg, listDemonList, listDemon, setPercent) {
        await mesg.edit({
            embed: new MessageEmbed()
            .setAuthor(`Demon #${num}`, message.author.displayAvatarURL())
            .setDescription(`**__${levelInfo[1]}__ by ${levelInfo[2]}** (${levelInfo[0]})${listDemon}
            
            **Required percent:** ${percent}%`)
            .setColor(mainLib.getMessageEmbed(levelInfo[3]))
            .setThumbnail(mainLib.getMessageThumbnail(levelInfo[3], levelInfo[4], levelInfo[5]))})
            await mesg.react(utils.success)
            await mesg.react(utils.failed)
            const filterr = (reaction, user) => {
                return [utils.success, utils.failed].includes(reaction.emoji.id) && user.id === message.author.id;
            }
            const collector = await mesg.createReactionCollector(filterr);
            await collector.on('collect', (reaction, user) => {
                switch (reaction.emoji.id) {
                    case utils.success:
                        if (stopped == 1) return;
                        setPercent(mesg, easy, medium, hard, insane, extreme, num, percent, collector, levelInfo, demonChoices, listDemonList);
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
                                        ● **Rating:** ${mainLib.getDemonDiff(levelInfo[3])}`)
                                        .setColor(0xff0000)
                                        .setTimestamp()
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
                                    /*mesg.react(utils.info);
                                    const newFilter = (reacti, use) => {
                                        return [utils.info].includes(reacti.emoji.id) && use.id === message.author.id;
                                    }
                                    const newCollector = mesg.createReactionCollector(newFilter);
                                    newCollector.on('collect', (reacti, use) => {
                                        let levelStr = "";
                                        for (i = 0; i < 4; i++) {
                                            levelStr += findLevel(easy, medium, hard, insane, extreme, num, percent, mesg, listDemonList);
                                            console.log(levelStr);
                                        }
                                    });*/
                                    listDemonList.delete(message.author.id);
                                    db.prepare(`UPDATE profiles SET inRoulette = 0 WHERE userID = ?`).run(message.author.id);
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
    }

    if (command == 'ping') {
        message.channel.send(`Pinging...`).then(m=>{
            m.edit(`Pong! Time taken: \`${m.createdTimestamp - message.createdTimestamp} ms.\``);
        });
    }

    if (command == 'help') {
        if (!args[0]) message.channel.send({
            embed: new MessageEmbed()
            .setAuthor('Help Menu', message.author.displayAvatarURL())
            .setDescription(`\`${config.prefix}ping\` - Tests the bot's ping!
            \`${config.prefix}help\` - Describes what commands this bot can do!
            \`${config.prefix}invite\` - Invite this bot to your own server!
            \`${config.prefix}server\` - Join the support server!
            \`${config.prefix}start\` - Starts a Demon Roulette!
            \`${config.prefix}stop\` - Force quits a Demon Roulette!
            \`${config.prefix}profile [userID or mention]\` - View your profile!
            \`${config.prefix}lb, ${config.prefix}leaderboard, ${config.prefix}leaderboards\` - View the completed roulette leaderboard!
            \`${config.prefix}suggest <suggestion (fewer than 500 characters)>\` - Suggest something for the bot!
            \`${config.prefix}review <suggestion ID> <review (fewer than 500 characters)>\` - Review a suggestion! **(bot owners only)**
            \`${config.prefix}warn <user ID> <warn message>\` - Warns a user! **(bot owners only)**`)
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
            case 'review':
                message.channel.send({
                    embed: new MessageEmbed().setTitle('Review Command').setDescription('Reviews a suggestion from the bot, and will send a message to the user that originally made the suggestion. **Can only be done by bot owners.**').setFooter(`Usage: ${config.prefix}review <suggestion ID> <review (must be fewer than 500 characters)>`)
                });
                break;
            case 'warn':
                message.channel.send({
                    embed: new MessageEmbed().setTitle('Warn Command').setDescription('Warns a user in the bot using the ID and message provided. **Can only be done by bot owners.**').setFooter(`Usage: ${config.prefix}warn <user ID> <warn message>`)
                });
                break;
            case 'stop':
                message.channel.send({
                    embed: new MessageEmbed().setTitle('Stop Command').setDescription('Force quits a demon roulette. Use it only if the bot does something it shouldn\'t do, like say you\'re in a demon roulette when you actually aren\'t.').setFooter(`Usage: ${config.prefix}stop`)
                });
                break;
        }
    }
    }

    if (command == 'invite') {
        message.channel.send(`Use this link to invite the Demon Roulette bot to your server! ${utils.invLink}`);
    }

    if (command == 'server') {
        message.channel.send(`Use this link to join the support server for the Geometry Dash Demon Roulette! ${utils.serverLink}`);
    }

    if (['lb', 'leaderboard', 'leaderboards'].includes(command)) {
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
    }

    if (command == 'resetprofile') {
        if (message.author.id !== utils.ID.owner) return;
        if (!args[0] || isNaN(parseInt(args[0]))) return;
        update = db.prepare(`UPDATE profiles SET completedRoulette = 0, rouletteNumber = 0, recentPercentage = 0, recentDemonStr = ?, inRoulette = 0 WHERE userID = ?`);
        update.run("", args[0]);
        message.delete();
        message.channel.send(`<:success:743975403034509333>`).then(m=>{
            setTimeout(function(){
                m.delete();
            }, 5000);
        });
    }

    if (command == 'resetcheck') {
        if (message.author.id !== utils.ID.owner) return;
        if (!args[0] || isNaN(parseInt(args[0]))) return message.delete();
        update = db.prepare(`UPDATE profiles SET inRoulette = 0 WHERE userID = ?`).run(message.author.id);
        message.delete();
        message.channel.send(`<:success:743975403034509333>`).then(m=>{
            setTimeout(function(){
                m.delete();
            }, 5000);
        });
    }

    if (command == 'warn') {
        if (message.author.id !== utils.ID.owner) return message.channel.send(`You do not have permission to use this command.`);
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
        message.channel.send(`<:success:743975403034509333> ${bot.users.cache.get(args[0]).tag} has been successfully warned.`);
    }

    if (command == 'profile') {
        let mentionUser = message.mentions.users.first();
        if (mentionUser) {
            row = db.prepare(`SELECT * FROM profiles WHERE userID = ?`).get(mentionUser.id);
            if (!row || row == undefined) {
                return message.channel.send(`Either that user doesn't exist, or they haven't played in the Demon Roulette. Please try again.`);
            } else {
                let newNewRow = db.prepare(`SELECT * FROM profiles WHERE userID = ?`).get(message.author.id);
                if (!newNewRow || newNewRow == undefined) {
                    insert = db.prepare(`INSERT INTO profiles (userID, completedRoulette, rouletteNumber, recentPercentage, recentDemonStr, inRoulette, userTag) VALUES (?, ?, ?, ?, ?, ?, ?)`);
                    insert.run(message.author.id, 0, 0, 0, "", 0, message.author.tag);
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
                    .setFooter(`User ID: ${memberNam.user.id}`).setTimestamp()
                });
            }
        } else {
            row = db.prepare(`SELECT * FROM profiles WHERE userID = ?`).get(message.author.id);
            if (!row || row == undefined) {
                insert = db.prepare(`INSERT INTO profiles (userID, completedRoulette, rouletteNumber, recentPercentage, recentDemonStr, inRoulette, userTag) VALUES (?, ?, ?, ?, ?, ?, ?)`);
                insert.run(message.author.id, 0, 0, 0, "", 0, message.author.tag);
            }
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
                .setFooter(`User ID: ${message.author.id}`).setTimestamp()
            });
    }
}

    if  (command == 'suggest') {
        row = db.prepare(`SELECT * FROM suggestions WHERE userID = ?`).get(message.author.id);
        if (row) return message.reply(`You can only suggest one thing at a time. Please wait until your previous suggestion as been reviewed before you suggest something else.`)
        let suggestion = args.splice(0).join(" ");
        if (!suggestion || suggestion.length > 500) return message.channel.send({
            embed: new MessageEmbed().setAuthor(`Invalid Syntax`, message.author.displayAvatarURL()).setDescription(`Correct Usage:\n\`${config.prefix}suggest <suggestion (must be fewer than 500 characters)>\``).setColor(0xff0000).setTimestamp()
        });        
        insert = db.prepare(`INSERT INTO suggestions (userID, suggestion) VALUES (?, ?)`).run(message.author.id, Buffer.from(suggestion).toString('base64'));
        let suggestRow = db.prepare(`SELECT suggestID FROM suggestions WHERE userID = ?`).get(message.author.id);
        bot.guilds.cache.get(utils.guildID).channels.cache.get(utils.channels.suggestions).send({
            embed: new MessageEmbed()
            .setAuthor(`New Suggestion`, message.author.displayAvatarURL())
            .setDescription(`**Suggestion:** ${suggestion}`)
            .setColor(0xff99ff).setTimestamp()
            .setFooter(`ID: ${suggestRow.suggestID}`)
        });
        message.channel.send(`<:success:743975403034509333> Suggestion added!`);
    }

    if (command == 'review') {
        if (message.author.id !== utils.ID.owner) return message.channel.send(`You do not have permission to use this command.`);
        let review = args.splice(1).join(" ");
        if (!args[0] || isNaN(parseInt(args[0])) || !review || review.length > 500) return message.channel.send({
            embed: new MessageEmbed().setAuthor(`Invalid Syntax`, message.author.displayAvatarURL()).setDescription(`Correct Usage:\n\`${config.prefix}review <suggestion ID> <review (must be fewer than 500 characters)>\``).setColor(0xff0000).setTimestamp()
        });
        row = db.prepare(`SELECT * FROM suggestions WHERE suggestID = ?`).get(args[0]);
        bot.guilds.cache.get(utils.guildID).channels.cache.get(utils.channels.suggestions).send({
            embed: new MessageEmbed()
            .setAuthor(`Suggestion Reviewed`, message.author.displayAvatarURL())
            .setDescription(`**Original Suggestion:** ${Buffer.from(row.suggestion, 'base64').toString()}\n\n**Review:** ${review}`)
            .setColor(0xff9966).setTimestamp()
            .setFooter(`Reviewed by ${message.author.tag}`)
        });
        bot.users.cache.get(row.userID).send({
            embed: new MessageEmbed()
            .setAuthor(`Suggestion Reviewed`, message.author.displayAvatarURL())
            .setDescription(`Your most recent suggestion for the bot has been reviewed by **${message.author.tag}!**\n\n**Original Suggestion:** ${Buffer.from(row.suggestion, 'base64').toString()}\n\n**Review:** ${review}`)
            .setColor(0xff9966).setTimestamp()
        });
        del = db.prepare(`DELETE FROM suggestions WHERE suggestID = ?`).run(args[0]);
        message.channel.send(`<:success:743975403034509333> Suggestion reviewed!`);
    }

    if (command == 'start') {
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
        if (user.inRoulette) return message.channel.send(`You're already in a Demon Roulette! You can only play one roulette at a time.\nIf you believe this is incorrect, type \`${config.prefix}stop\` to end the roulette you're currently in.`);
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
                ● Try and get as many demons as you can!
                
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
                                ● Try and get as many demons as you can!
                                
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
                                    ● Try and get as many demons as you can!
                                    
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
                                        ● Try and get as many demons as you can!
                                        
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
                                            ● Try and get as many demons as you can!
                                            
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
                                                ● Try and get as many demons as you can!
                                                
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
                                                db.prepare(`UPDATE profiles SET rouletteNumber = rouletteNumber + 1 WHERE userID = ?`).run(message.author.id);
                                                findLevel(easyDemon, mediumDemon, hardDemon, insaneDemon, extremeDemon, demonNumber, percent, m, listDemonList);
                                                }
                                                break;
                                                case utils.cross:
                                                    m.delete();
                                                    db.prepare(`UPDATE profiles SET inRoulette = 0 WHERE userID = ?`).run(message.author.id);
                                                    message.channel.send(`Demon roulette has been cancelled.`).then(mm=>{
                                                    setTimeout(function(){
                                                      mm.delete();  
                                                    }, 5000);
                                                });
                                                collector.stop();
                                                break;
                    }
                });
            });
    }

    if (command == 'stop') {
        row = db.prepare(`SELECT * FROM profiles WHERE userID = ?`).get(message.author.id);
        if (row.inRoulette == 0) return message.channel.send(`You are currently not in a Demon Roulette!`);
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
                            stopped = 1;
                            mm.edit({
                                embed: new MessageEmbed().setTitle(`Demon Roulette has been officially stopped by the user.`)
                                .setColor(0xff0000)
                            });
                            break;
                        case utils.cross:
                            mm.delete();
                            message.delete(command);
                            break;
                    }
                });
        });
    }
});