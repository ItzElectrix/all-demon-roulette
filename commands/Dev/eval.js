const {
    MessageEmbed
} = require('discord.js')
module.exports = {
    name: "eval",
    category: "Dev",
    description: "No description provided",
    perms: "dev",
    guildOnly: false,
    exec: async(bot, message, args) => {
        return; // BOT TESTING ONLY
        function clean(text) {
            if (typeof(text) == "string")
                return text.replace(/` /g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
            else
                return text;
        }
        try {
            var code = args.join(" ");
            var evaled = eval(code);
            if (typeof evaled !== "string")
                evaled = require("util").inspect(evaled);
            let thing = clean(evaled)
            thing = thing.replace(bot.token, "TOKEN")
            message.reply({
                embeds: [new MessageEmbed().addField("Javascript Eval:", "Success!").addField(":inbox_tray: **INPUT**", "```js\n" + args.join(" ") + "```").addField(":outbox_tray: **OUTPUT**", "```js\n" + thing + "```").setColor(0x00FF00)]
            }).catch()
        } catch (err) {
            message.reply({
                embeds: [new MessageEmbed().addField("Javascript Eval ERROR:", "There was a problem with the code your trying to run!").addField("Error", "```js\n" + clean(err) + "```").setColor(0xFF0000)]
            })
        }
    }
}