// you wont ever have to touch this when making new commands, you're welcome lol
const {
    MessageEmbed
} = require('discord.js')
module.exports = {
    name: "help",
    description: "Describes what commands this bot can do!",
    helpInfo: "What you're using right now; Sends a message that describes each command the bot can do.",
    usage: "[command name]",
    category: "General",
    guildOnly: false,
    helpOrder: 1,
    exec: async (client, message, args) => {
        const config = client.config;
        if (!args[0]) {
            let commands = client.commands.filter(x => x.category != "Dev").sort((a, b) => a.helpOrder - b.helpOrder).map(command => {
                return `\`${config.prefix}${(command.aliases) ? `${command.name}, ${command.aliases.map(cmd => `${config.prefix}${cmd}`).join(", ")}` : command.name}${(command.usage) ? ` ${command.usage}` : ''}\` - ${command.description}`;
            })
            message.reply({
                allowedMentions: {
                    repliedUser: false
                },
                embeds: [new MessageEmbed()
                    .setAuthor('Help Menu', message.author.displayAvatarURL())
                    .setDescription(commands.join("\n"))
                    .setColor(message.guild.members.cache.get(message.author.id).displayHexColor)
                    .setFooter(`Type ${config.prefix}help <command name> to learn more on what each command does.`).setTimestamp()
                ]
            });
        } else {
            const commandName = args[0].toLowerCase();
            const command = client.commands.get(commandName) || client.commands.get(client.aliases.get(commandName));
            if (!command) return message.reply("**Invalid command.**");
            return message.reply({
                allowedMentions: {
                    repliedUser: false
                },
                embeds: [new MessageEmbed().setTitle(commandName.charAt(0).toUpperCase() + commandName.slice(1) + ' Command').setDescription(command.helpInfo).setFooter(`Usage: ${config.prefix}${(command.aliases) ? `${command.name}, ${command.aliases.map(cmd => `${config.prefix}${cmd}`).join(", ")}` : command.name}${(command.usage) ? ` ${command.usage}` : ''}`)]
            });
        }
    }
}