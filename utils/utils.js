const Discord = require("discord.js"),
  config = require("../config/config.json"),
  serverSettings = new Map(),
  fs = require("fs"),
  errorLog = new Discord.WebhookClient(config.error.id, config.error.token),
  db = require("../models/" + config.db.model);

module.exports = {
  db: db,
  // ERROR LOGGING
  alertError: function(msg, error) {
    let bot = msg.client;
    msg.channel.send("I've run into an error. I've let my owner know.")
      .then(m => m.delete(10000));
    console.trace(error);

    let errorInfo = new Discord.RichEmbed()
    .setTitle(bot.user.username + " Error")
    .addField("User", msg.author.username, true)
    .addField("Location", (msg.guild ? `${msg.guild.name} > ${msg.channel.name}` : "PM"), true)
    .addField("Command", msg.cleanContent, true)
    .addField("Error", (error.stack ? error.stack.slice(0, 1200) : (error ? error.slice(0, 1000) : "")), true);

    if (bot.shard) errorInfo.addField("Shard", bot.shard.id, true);

    errorLog.send(errorInfo);
  },
  errorLog: errorLog,

  // GENERAL UTILITY
  clean: function(msg, t = 10000) {
    if (msg.deletable) msg.delete(t);
  },
  userMentions: function(msg) {
    // Useful to ensure the bot isn't included in the mention list,
    // such as when the bot mention is the command prefix
    let bot = msg.client;
    let userMentions = msg.mentions.users;
    if (userMentions.has(bot.user.id)) userMentions.delete(bot.user.id);
    return userMentions;
  },

  prefix: function(msg) {
    if (msg.guild) return db.getSetting(msg.guild, "prefix");
    else return config.prefix;
  },

  embed: () => new Discord.RichEmbed().setColor(config.color)
};
