const Augur = require("augurbot"),
  u = require("../utils/utils");

const customCommands = new Map();

function runCustomCommand(msg) {
  let cmd = u.parse(msg);
  if (cmd && customCommands.get(msg.guild.id).has(cmd.command)) {
    let command = customCommands.get(msg.guild.id).get(cmd.command);
    if (command.attachment) {
      msg.channel.send(
        command.response,
        {
          file: {
            attachment: process.cwd() + "/storage/" + command._id,
            name: command.attachment
          }
        }
      );
    } else msg.channel.send(command.response);
    return true;
  } else if (cmd && (cmd.command == "help") && (customCommands.get(msg.guild.id).size > 0) && !cmd.suffix) {
    let embed = u.embed()
    .setTitle("Custom Commands in " + msg.guild.name)
    .setThumbnail(msg.guild.iconURL);

    let prefix = u.prefix(msg);
    prefix = prefix.replace(/<@!?d+>/g, `@${msg.guild.members.get(msg.client.user.id).displayName} `);

    let list = Array.from(customCommands.get(msg.guild.id).values()).map(c => prefix + c.command).sort();

    embed.setDescription(list.join("\n"));
    msg.author.send(embed);
  }
}

const Module = new Augur.Module()
.addCommand({name: "customcommand",
  category: "Server Admin",
  syntax: "<Command Name> <Command Response>",
  description: "Adds a custom command for your server.",
  info: "Adds a custom command for your server. If the command has the same name as one of the default commands, the custom command will override the default functionality.",
  process: async (msg, suffix) => {
    if (suffix) {
      let args = suffix.split(" ");
      let newCommand = args.shift().toLowerCase();
      let response = args.join(" ");
      let attachment = ((msg.attachments && (msg.attachments.size > 0)) ? msg.attachments.first() : null);

      if (response || attachment) {
        try {
          let cmd = await Module.db.commands.addCommand({
            serverId: msg.guild.id,
            command: newCommand,
            response: response,
            attachment: (attachment ? attachment.filename : null),
            url: (attachment ? attachment.url : null)
          });

          if (!customCommands.has(cmd.serverId)) customCommands.set(cmd.serverId, new Map());
          customCommands.get(cmd.serverId).set(cmd.command, cmd);
          msg.channel.send(`I added the \`${u.prefix(msg)}${cmd.command}\` command to your server!`).then(u.clean);
        } catch(e) { u.alertError(e, msg); }
      } else if (customCommands.has(msg.guild.id) && customCommands.get(msg.guild.id).has(newCommand)) {
        try {
          let cmd = await Module.db.commands.removeCommand(msg.guild, newCommand);
          customCommands.get(cmd.serverId).delete(cmd.command);
          msg.channel.send(`I removed the custom \`${u.prefix(msg)}${cmd.command}\` command.`);
        } catch(e) { u.alertError(e, msg); }
      } else
        msg.reply(`I couldn't find the command \`${u.prefix(msg)}${newCommand}\` to alter.`);
    } else {
      msg.reply("you need to tell me the command name and the intended command response.").then(u.clean);
    }
  },
  permissions: (msg) => msg.guild && (msg.member.permissions.has("MANAGE_GUILD") || msg.member.permissions.has("ADMINISTRATOR") || Module.config.adminId.includes(msg.author.id))
})
.setInit(() => {
  Module.db.commands.fetchCommands().then(cmds => {
    cmds = cmds.filter(c => Module.handler.client.guilds.has(c.serverId));
    console.log(`Loaded ${cmds.length} custom commands${(Module.handler.client.shard ? " on Shard " + Module.handler.client.shard.id : "")}.`);
    cmds.forEach(cmd => {
      if (!customCommands.has(cmd.serverId)) customCommands.set(cmd.serverId, new Map());
      customCommands.get(cmd.serverId).set(cmd.command, cmd);
    });
  });
})
.addEvent("message", (msg) => {
  if (msg.guild && customCommands.has(msg.guild.id)) return runCustomCommand(msg);
})
.addEvent("messageUpdate", (oldMsg, msg) => {
  if (msg.guild && customCommands.has(msg.guild.id)) return runCustomCommand(msg);
});

module.exports = Module;
