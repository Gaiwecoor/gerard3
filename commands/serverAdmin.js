const Augur = require("augurbot"),
  u = require("../utils/utils.js");

const Module = new Augur.Module()
  .addCommand({
    name: "settings",
    description: "Update Server Settings",
    info:
      "Sends a link to updates server-specific settings (prefix, botspam, announce, role management).",
    aliases: ["setting", "set"],
    category: "Server Admin",
    process: async (msg) => {
      try {
        if (msg.guild) {
          await msg.author.send(
            `Manage Gerard settings for ${msg.guild.name} here: <${Module.config.homePage}manage/${msg.guild.id}>`
          );
          msg.channel
            .send("I sent you a link to your server management page.")
            .then(u.clean);
        } else
          msg.channel.send(
            `Manage Gerard settings for your server(s) here: <${Module.config.homePage}manage>`
          );
      } catch (e) {
        u.alertError(e, msg);
      }
    },
    permissions: (msg) =>
      !msg.guild ||
      (msg.guild &&
        (msg.member.permissions.has("MANAGE_GUILD") ||
          msg.member.permissions.has("ADMINISTRATOR") ||
          Module.config.adminId.includes(msg.author.id))),
  })
  .addEvent("guildCreate", (guild) => {
    Module.db.server.addServer(guild);
  });

module.exports = Module;

/*
function oldSettings(msg, suffix) {
  let args = suffix.split(" ");

  if (args.length < 2) {
    msg.reply("you need to tell me both a setting and a value.")
    .then(u.clean);
    return;
  }

  let value, setting = args.shift().toLowerCase();

  if ((setting == "botspam") || (setting == "spam")) {
    // BOT SPAM
    value = args.join(" ").trim().toLowerCase();
    let channel = null;

    if (msg.mentions.channels.size > 0) {
      // SAVE BY MENTION
      channel = msg.mentions.channels.first().id;
    } else if ((value == "none") || (value == "false")) {
      // REMOVE BOTSPAM
      channel = "REMOVE";
    } else {
      // SAVE BY CHANNEL NAME
      if (value == "here") {
        channel = msg.channel.id;
      } else {
        channel = msg.guild.channels.find(c => c.name.toLowerCase() == value).id;
      }
    }

    if (channel) {
      channel = (channel != "REMOVE" ? channel : null);
      if (channel && !(msg.guild.channels.get(channel) && msg.guild.channels.get(channel).permissionsFor(msg.client.user).has(["VIEW_CHANNEL","SEND_MESSAGES"]))) {
        msg.reply(`I can't send messages to <#${channel}>`).then(u.clean).catch(console.error);
      } else {
        Module.db.server.saveSetting(msg.guild, "botspam", channel);
        msg.channel.send("Botspam channel settings saved! :thumbsup:");
      }
    } else {
      msg.reply("you need to tell me which channel to use.")
      .then(u.clean).catch(console.error);
    }
  } else if ((setting == 'prefix') || (setting == 'command')) {
    // PREFIX
    value = args.join(" ").trim();
    let userMentions = u.userMentions(msg);
    if (userMentions && ((userMentions.size > 1) || ((userMentions.size == 1) && (userMentions.first().id != msg.client.user.id)))) {
      msg.reply("you cannot set the command prefix to mention any user but me.").then(u.clean);
    } else {
      Module.db.server.saveSetting(msg.guild, 'prefix', value);
      msg.channel.send("Prefix settings saved! :thumbsup:")
      .then(u.clean).catch(console.error);
    }
  } else if ((setting == 'language') || (setting == 'locale')) {
    // LANGUAGE
    value = args.join(" ").trim().toUpperCase();
    let locales = ["EN"];
    if (locales.includes(value)) {
      Module.db.server.saveSetting(msg.guild, "language", value);
      msg.channel.send("Language settings saved! :thumbsup:")
      .then(u.clean).catch(console.error);
    } else {
      msg.reply("Available languages include: " + locales.join(", "))
      .then(u.clean).catch(console.error);
    }
  } else if (setting == "announce") {
    // ANNOUNCE
    value = args.join(" ").trim().toLowerCase();
    let channel = null;

    if (msg.mentions.channels.size > 0) {
      // SAVE BY MENTION
      channel = msg.mentions.channels.first().id;
    } else if ((value == "none") || (value == "false")) {
      // REMOVE ANNOUNCE
      channel = "REMOVE";
    } else {
      // SAVE BY CHANNEL NAME
      if (value == "here") {
        channel = msg.channel.id;
      } else {
        channel = msg.guild.channels.find(c => c.name.toLowerCase() == value).id;
      }
    }

    if (channel) {
      channel = (channel != "REMOVE" ? channel : null);
      if (channel && !(msg.guild.channels.get(channel) && msg.guild.channels.get(channel).permissionsFor(msg.client.user).has(["VIEW_CHANNEL","SEND_MESSAGES"]))) {
        msg.reply(`I can't send messages to <#${channel}>`).then(u.clean).catch(console.error);
      } else {
        Module.db.server.saveSetting(msg.guild, "botspam", channel);
        msg.channel.send("Announce channel settings saved! :thumbsup:");
      }
    } else {
      msg.reply("you need to tell me which channel to use.")
      .then(u.clean).catch(console.error);
    }
  }
}
*/
