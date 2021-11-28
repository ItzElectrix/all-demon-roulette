const { MessageEmbed } = require('discord.js')
module.exports = (client, guild) => {
    client.guilds.cache.get(client.utils.guildID).channels.cache.get(client.utils.channels.guild).send({
        embed: new MessageEmbed()
        .setTitle('Guild Removed')
        .setDescription(`Geometry Dash Demon Roulette has been removed from **${guild.name}**...`)
        .setTimestamp()
        .setColor(0xff0000)
    });
    client.funcs.updateStatus();
}