const Discord = require("discord.js"),
  config = require("../config/config.json"),
  serverSettings = new Map(),
  fs = require("fs"),
  errorLog = new Discord.WebhookClient(config.error.id, config.error.token),
  db = require("../" + config.db.model);

const Utils = {
  alertError: function(error, msg = null) {
    if (!error || error.name == "DiscordAPIError") return;
    else if (error.error && error.error.code == 503) {
      if (msg && msg.channel.send) msg.channel.send("The API is down temporarily. Please try again in a few minutes.");
      return;
    }

    let errorInfo = new Discord.RichEmbed()
    .setTimestamp()
    .setTitle(error.name);

    if (typeof msg == "string") {
      errorInfo.addField("Message", msg);
    } else if (msg) {
      let bot = msg.client;
      if (bot.shard) errorInfo.addField("Shard", bot.shard.id, true);

      msg.channel.send("I've run into an error. I've let my owner know.")
      .then(Utils.clean);

      errorInfo
      .addField("User", msg.author.username, true)
      .addField("Location", (msg.guild ? `${msg.guild.name} > ${msg.channel.name}` : "PM"), true)
      .addField("Command", (msg.cleanContent ? msg.cleanContent : "EMPTY"), true)
    }

    let errorStack = (error.stack ? error.stack : error);

    console.error(Date());
    if (msg && typeof msg == "string") console.error(msg);
    else if (msg) console.error(`${msg.author.username} in ${(msg.guild ? (msg.guild.name + " > " + msg.channel.name) : "DM")}: ${msg.cleanContent}`);

    console.error((errorStack ? errorStack : "NULL"));

    if (errorStack.length > 1024) errorStack = errorStack.slice(0, 1000);
    errorInfo.addField("Error", (errorStack ? errorStack : "NULL"));
    errorLog.send(errorInfo);
  },
  botSpam: function(msg) {
    if (msg.guild) {
      let botspam = db.server.getSetting(msg.guild, "botspam");
      if (botspam && (botspam != msg.channel.id)) {
        msg.reply(`I've placed your results in <#${botspam}> to keep things nice and tidy in here. Hurry before they get cold!`)
          .then(Utils.clean).catch();
        return msg.guild.channels.get(botspam) || msg.channel;
      }
    }
    return msg.channel;
  },
  clean: (msg, t = 15000) => {
    if (msg.deletable) msg.delete(t);
  },
  decode: (name, fallback = "Name Error") => {
    let ename = escape(name);
    try {
      name = decodeURIComponent(ename);
    } catch(e1) {
      try {
        let index = ename.lastIndexOf("%");
        name = decodeURIComponent(ename.substring(0, index) + ename.substring(index + 3));
      } catch(e2) {
        name = fallback;
      }
    }
    return name;
  },
  embed: () => new Discord.RichEmbed().setColor(config.color).setFooter("Support Gerard development at https://www.patreon.com/gaiwecoor"),
  errorLog: errorLog,
  escapeText: (txt) => txt.replace(/\*/g,"\\*").replace(/_/g,"\\_").replace(/~/g,"\\~"),
  handler: null,
  parse: function(msg) {
    try {
      let prefix = Utils.prefix(msg);
      let message = msg.content;
      let parse;

      if (msg.author.bot) {
        parse = null;
      } else if (message.startsWith(prefix)) {
        parse = message.slice(prefix.length);
      } else if (message.startsWith(`<@${msg.client.user.id}>`)) {
        parse = message.slice((`<@${msg.client.user.id}>`).length);
      } else if (message.startsWith(`<@!${msg.client.user.id}>`)) {
        parse = message.slice((`<@!${msg.client.user.id}>`).length);
      }

      if (parse) {
        parse = parse.trim().split(" ");
        return {
          command: parse.shift().toLowerCase(),
          suffix: parse.join(" ")
        };
      } else return null;
    } catch(e) {
      Utils.alertError(e, msg);
      return null;
    }
  },
  prefix: function(msg) {
    try {
      if (msg.guild) return db.server.getSetting(msg.guild, "prefix");
      else return config.prefix;
    } catch(e) {
      Utils.alertError(e, msg);
      return config.prefix;
    }
  },
  setHandler: (handler) => Utils.handler = handler,
  userMentions: function(msg) {
    // Useful to ensure the bot isn't included in the mention list,
    // such as when the bot mention is the command prefix
    let userMentions = msg.mentions.users;
    if (userMentions.has(msg.client.user.id)) userMentions.delete(msg.client.user.id);
    return (userMentions.size > 0 ? userMentions : null);
  }
};

module.exports = Utils;
