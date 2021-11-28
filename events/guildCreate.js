const { MessageEmbed } = require('discord.js')
module.exports = (client, guild) => {
    client.guilds.cache.get(client.utils.guildID).channels.cache.get(client.utils.channels.guild).send({
        embed: new MessageEmbed()
        .setTitle('Guild Added')
        .setDescription(`Geometry Dash Demon Roulettes are now going on in **${guild.name}**!`)
        .setFooter(`Member Count: ${guild.memberCount}`).setTimestamp()
        .setColor(0x00ff00)
    });
    client.funcs.updateStatus();
}