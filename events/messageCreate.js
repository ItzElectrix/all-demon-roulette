module.exports = (client, message) => {
    if (message.author.bot || message.channel.type == 'DM') return;
    if (!message.content.toLowerCase().startsWith(client.config.prefix)) return;
    const args = message.content.slice(client.config.prefix.length).trim().split(" ");
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName) || client.commands.get(client.aliases.get(commandName));
    if (!command) return;
    if (command.category == "Dev") return; // Remove only for testing
    client.cmdName = commandName;
    try {
        return command.exec(client, message, args);
    } catch (e) {
        console.error(e)
        client.funcs.receiveError(message, e);
    }
}