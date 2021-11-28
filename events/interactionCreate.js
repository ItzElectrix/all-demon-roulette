module.exports = async (client, interaction) => {
    if (!interaction.isCommand()) return;
    const predefinedFuncs = {
        reply: async (content) => {
            return await interaction.reply(content)
        },
        replyPrivate: async (content) => {
            if (content.embeds) {
                return await interaction.reply({
                    embeds: content.embeds,
                    ephemeral: true
                })
            } else {
                return await interaction.reply({
                    content: content,
                    ephemeral: true
                })
            }
        },
        edit: async (content) => {
            return await interaction.editReply(content)
        }
    }
    interaction.author = {
        id: interaction.user.id,
        username: interaction.user.username,
        tag: `${interaction.user.username}#${interaction.user.discriminator}`,
        send: predefinedFuncs.replyPrivate,
        displayAvatarURL: (content) => {
            return interaction.user.displayAvatarURL();
        },
        toString: () => `<@${interaction.user.id}>`
    }
    interaction.interaction = true;
    const command = client.commands.get(interaction.commandName) || client.commands.get(client.aliases.get(interaction.commandName));
    if (!command) return interaction.reply({
        content: "**Invalid command**",
        ephemeral: true
    });
    if (!interaction.inGuild()) return interaction.reply({
        content: "**Commands are currently not allowed in DMs.**"
    })
    client.cmdName = interaction.commandName;
    try {
        return command.exec(client, interaction, []);
    } catch (e) {
        client.funcs.receiveError(e);
    }
}