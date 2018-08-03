const Augur = require("../utils/Augur"),
  Module = new Augur.Module(),
  u = require('../utils/utils.js');

Module.addCommand({name: "settings",
  description: "Update Server Settings",
  syntax: "<botspam | prefix | language> <value>",
  info: "Updates server-specific settins.\n**SERVER ADMINS ONLY**\n* botspam #channel | here | none\n* prefix !\n* language EN | FR",
  aliases: ["setting", "set"],
  hide: false,
  category: "Admin",
  process: function(msg, suffix) {
    let args = suffix.split(" ");

    if (args.length < 2) {
      msg.reply(Module.locale(msg, "SERVERADMIN_SETTINGS_VALUE")))
      .then(u.clean).catch(console.error);
      return;
    }

    let setting = args.shift().toLowerCase();
    let value = args.join(" ").trim();

    if ((setting == "botspam") || (setting == "spam")) {
      // BOT SPAM
      if (msg.mentions.channels.size > 0) {
        // SAVE BY MENTION
        u.db.server.saveSetting(msg.guild, 'botspam', msg.mentions.channels.first().id);
        msg.channel.send("BotSpam" + Module.locale(msg, "SERVERADMIN_SETTINGS_SAVED"))
        .then(u.clean).catch(console.error);
      } else if ((value == "none") || (value == "false")) {
        // REMOVE BOTSPAM
        u.db.server.updateSetting(msg.guild, 'botspam', null);
        msg.channel.send("BotSpam" + Module.locale(msg, "SERVERADMIN_SETTINGS_SAVED"))
        .then(u.clean).catch(console.error);
      } else {
        // SAVE BY CHANNEL NAME
        let channel = null;
        if (value == "here") {
          channel = msg.channel;
        } else {
          channel = msg.guild.channels.find('name', value);
        }
        if (channel) {
          u.db.server.saveSetting(msg.guild, 'botspam', channel.id);
          msg.channel.send("BotSpam" + Module.locale(msg, "SERVERADMIN_SETTINGS_SAVED"))
          .then(u.clean).catch(console.error);
        } else {
          msg.reply(Module.locale(msg, "SERVERADMIN_SETTINGS_NEEDCHANNEL"))
          .then(u.clean).catch(console.error);
        }
      }
    } else if ((setting == 'prefix') || (setting == 'command')) {
      // PREFIX
      let userMentions = u.userMentions(bot, msg);
      if ((userMentions.size > 1) || ((userMentions.size == 1) && (userMentions.first().id != bot.user.id))) {
        msg.reply(Module.locale(msg, "SERVERADMIN_SETTINGS_NOMENTIONS")).then(u.clean);
      } else {
        u.db.server.saveSetting(msg.guild, 'prefix', value);
        msg.channel.send("Prefix" + Module.locale(msg, "SERVERADMIN_SETTINGS_SAVED"))
        .then(u.clean).catch(console.error);
      }
    } else if ((setting == 'language') || (setting == 'locale')) {
      let locales = ["EN", "FR"];
      if (locales.includes(value.toUpperCase())) {
        u.db.server.saveSetting(msg.guild, "language", value.toUpperCase());
        msg.channel.send("Language" + Module.locale(msg, "SERVERADMIN_SETTINGS_SAVED"))
        .then(u.clean).catch(console.error);
      } else {
        msg.reply(Module.local(msg, "SERVERADMIN_SETTINGS_ALLOWEDLOCALES") + locales.join(", "))
        .then(u.clean).catch(console.error);
      }
    }
  },
  permissions: (msg) => (msg.guild && (msg.member.hasPermission('MANAGE_GUILD') || msg.member.hasPermission('ADMINISTRATOR') || Module.config.adminId.includes(msg.author.id)))
});

module.exports = Module;
