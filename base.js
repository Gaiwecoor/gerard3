const Discord = require("discord.js"),
  u = require("./utils/utils"),
  config = require("./config/config.json"),
  bot = new Discord.Client(),
  Augur = require("./utils/Augur"),
  Handler = new Augur.Handler(bot, config),
  path = require("path"),
  fs = require("fs");

function processMessage(msg) {
  if (!msg.author.bot) {
    let message = msg.cleanContent;
    let prefix = u.prefix(msg);
    if (msg.cleanContent.startsWith(prefix)) {
      let parse = message.slice(prefix.length).trim().split(" ");
      let command = parse.shift();
      Handler.execute(command, msg, parse.join(" "));
    }
  }
}

bot.on("ready", () => {
  console.log(bot.user.username + (bot.shard ? ` Shard ${bot.shard.id}` : "") + " is ready!");
  console.log(`Listening to ${bot.channels.size} channels in ${bot.guilds.size} servers.`);

  let commands = fs.readdirSync("./commands");
  commands.forEach(file => {
    Handler.register(path.resolve(process.cwd(), "./commands/", file));
  });
});

bot.on("message", (msg) => {
  let halt = false;
  if (Handler.events.has("message") && (Handler.events.get("message").length > 0)) {
    Handler.events.get("message").forEach(handler => {
      if (!halt) halt = handler.handler(msg);
    });
  }
  if (!halt) processMessage(msg);
});

bot.on("messageUpdate", (oldMsg, msg) => {
  let halt = false;
  if (Handler.events.has("messageUpdate") && (Handler.events.get("messageUpdate").length > 0)) {
    Handler.events.get("messageUpdate").forEach(handler => {
      if (!halt) halt = handler.handler(oldMsg, msg);
    });
  }
  if (!halt) processMessage(msg);
});

config.events.forEach(event => {
  bot.on(event, (...args) => {
    if (Handler.events.has(event) && (Handler.events.get(event).length > 0)) {
      let halt = false;
      Handler.events.get(event).forEach(handler => {
        if (!halt) halt = handler.handler(...args);
      });
    }
  });
});

bot.login(config.token);

// LAST DITCH ERROR HANDLING
function handleError(event = "Error", err = null, p = null) {
	if (!err) return;

	console.error(Date(), "\n", event.toUpperCase(), "\n", err.message);
	console.trace(err);

	let errorInfo = new Discord.RichEmbed()
	.setTitle(event)
	.setTimestamp();

	if (bot.shard) errorInfo.addField("Shard", bot.shard.id, true);
	let errorStack = (err.stack ? err.stack : err);
	if (errorStack.length > 1024) errorStack = errorStack.slice(0, 1000);
	errorInfo.addField("Error", errorStack);
	if (p) {
    let promiseInfo = "Promise:\n" + p;
    if (promiseInfo.length > 1024) promiseInfo = promiseInfo.slice(0, 1000);
    errorInfo.addField("Promise Info", promiseInfo);
  }

	u.errorLog.send("", errorInfo);
}

process.on("unhandledRejection", (...args) => {
  handleError("Unhandled Rejection", ...args);
});
process.on("uncaughtException", (...args) => {
  handleError("Uncaught Exception", ...args);
});
