const Augur = require("../utils/Augur"),
  Module = new Augur.Module(),
  fs = require("fs"),
  u = require("../utils/utils");

Module.addCommand({name: "pulse",
  category: "Admin",
  description: "Check the bot's heartbeat",
  process: async function(msg, suffix) {
    let bot = msg.client;
    let Handler = Module.Handler;

    let embed = u.embed()
    .setAuthor(bot.user.username + " Heartbeat", bot.user.displayAvatarURL)
    .setTimestamp();

    if (bot.shard) {
      let guilds = await bot.shard.fetchClientValues('guilds.size');
      guilds = guilds.reduce((prev, val) => prev + val, 0);
      let channels = bot.shard.fetchClientValues('channels.size')
      channels = channels.reduce((prev, val) => prev + val, 0);
      let mem = bot.shard.broadcastEval("Math.round(process.memoryUsage().rss / 1024 / 1000)");
      mem = mem.reduce((t, c) => t + c);
      embed
      .addField("Shards", `Id: ${bot.shard.id}\n(${bot.shard.count} total)`, true)
      .addField("Total Bot Reach", `${guilds} Servers\n${channels} Channels`, true)
      .addField("Shard Uptime", `${Math.floor(bot.uptime / (24 * 60 * 60 * 1000))} days, ${Math.floor(bot.uptime / (60 * 60 * 1000)) % 24} hours, ${Math.floor(bot.uptime / (60 * 1000)) % 60} minutes`, true)
      .addField("Shard Commands Used", `${Handler.commandCount} (${(Handler.commandCount / (bot.uptime / (60 * 1000))).toFixed(2)}/min)`, true)
      .addField("Total Memory", `${mem}MB`, true);

      msg.channel.send({embed:embed});
    } else {
      let uptime = process.uptime();
      embed
      .addField("Uptime", `Discord: ${Math.floor(bot.uptime / (24 * 60 * 60 * 1000))} days, ${Math.floor(bot.uptime / (60 * 60 * 1000)) % 24} hours, ${Math.floor(bot.uptime / (60 * 1000)) % 60} minutes\nProcess: ${Math.floor(uptime / (24 * 60 * 60))} days, ${Math.floor(uptime / (60 * 60)) % 24} hours, ${Math.floor(uptime / (60)) % 60} minutes`, true)
      .addField("Reach", `${bot.guilds.size} Servers\n${bot.channels.size} Channels\n${bot.users.size} Users`, true)
      .addField("Commands Used", `${Handler.commandCount} (${(Handler.commandCount / (bot.uptime / (60 * 1000))).toFixed(2)}/min)`, true)
      .addField("Memory", `${Math.round(process.memoryUsage().rss / 1024 / 1000)}MB`, true);

      msg.channel.send({embed: embed});
    }
  }
})
.addCommand({name: "gotobed",
  category: "Admin",
  hidden: true,
  process: async function(msg) {
    if (msg.client.shard) {
      msg.client.shard.broadcastEval("this.destroy().then(() => process.exit())");
    } else {
      await msg.client.destroy();
      process.exit();
    }
  },
  permissions: (msg) => Module.config.adminId.includes(msg.author.id)
})
.addCommand({name: "reload",
  category: "Admin",
  syntax: "<file1.js> <file2.js>",
  description: "Reload command files.",
  info: "Use the command without a suffix to reload all command files.\n\nUse the command with the module name (including the `.js`) to reload a specific file.",
  process: (msg, suffix) => {
    let path = require("path");
    let files = (suffix ? suffix.split(" ") : fs.readdirSync(path.resolve(process.cwd(), "./commands")));

    files.forEach(file => {
      Module.handler.reload(path.resolve(process.cwd(), "./commands/", file));
    });
  },
  permissions: (msg) => Module.config.adminId.includes(msg.author.id)
});

module.exports = Module;
