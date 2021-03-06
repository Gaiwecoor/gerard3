const Augur = require("augurbot"),
  config = require("./config/config.json"),
  fs = require("fs"),
  path = require("path"),
  u = require("./utils/utils");

function loadCommands(Handler) {
  Handler.db.init(Handler.client);
  u.setHandler(Handler);
  Handler.client.on("ready", () => console.log("Ready at:", Date()));
  fs.readdirSync("./commands").filter(c => c.endsWith(".js")).forEach(command => {
    Handler.register(path.resolve(process.cwd(), "./commands/", command));
  });
}

const Handler = new Augur.Handler(config, {
  errorHandler: u.alertError,
  parse: u.parse,
  clientOptions: {
    disableEveryone: true,
    ws: {
      intents: 9474
    }
  }
});

Handler.start().then(loadCommands);

// LAST DITCH ERROR HANDLING
process.on("unhandledRejection", (error, p) => u.alertError(error, `Uncaught Rejection${(Handler.client.shard ? " on Shard " + Handler.client.shard.id : "")}`));
process.on("uncaughtException", error => u.alertError(error, `Uncaught Error${(Handler.client.shard ? " on Shard " + Handler.client.shard.id : "")}`));

module.exports = {Handler: Handler, bot: Handler.client};
