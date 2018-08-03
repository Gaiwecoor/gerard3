const fs = require("fs"),
  Collection = require("discord.js").Collection,
  path = require("path"),
  u = require("./utils"),
  locales = new Map();

/**********************
**  COMMAND HANDLER  **
**********************/

const Handler = function(bot, config) {
  this.commandCount = 0;
  this.commands = new Collection();
  this.aliases = new Collection();
  this.events = new Collection();
  this.clockwork = new Collection();
  this.unload = new Collection();
  this.config = config;
  this.bot = bot;
  this.db = require(path.resolve(process.cwd(), "./models/", this.config.db.model));

  return this;
};

Handler.prototype.register = function(file) {
  try {
    file = path.resolve(file);
    let load = require(file);

    load.config = this.config;
    load.db = this.db;
    load.handler = this;

    // REGISTER COMMANDS & ALIASES
    if (load.commands) {
      load.commands.forEach(command => {

        command.file = file;

        if (!this.commands.has(command.name))
        this.commands.set(command.name, command);

        if (command.aliases.length > 0) {
          command.aliases.filter(a => !this.aliases.has(a)).forEach(alias => {
            this.aliases.set(alias, command);
          });
        }
      });
    }

    // REGISTER EVENT HANDLERS
    if (load.events && (load.events.size > 0)) {
      load.events.forEach((handler, event) => {
        if (!this.events.has(event)) this.events.set(event, [{file: file, handler: handler}]);
        else this.events.get(x).push({file: file, handler: handler});
      });
    }

    // REGISTER CLOCKWORK
    if (load.clockwork) this.clockwork.set(file, load.clockwork(this.bot));

    // REGISTER UNLOAD FUNCTION
    if (load.unload) this.unload.set(file, load.unload);

  } catch(e) {
    u.errorLog.send(`**ERROR:** Could not register command file \`${file}\`\n` + e.stack.slice(0, 900));
  }

  return this;
};

Handler.prototype.reload = function(file = null) {
  file = path.resolve(file);
  try {
    // Clear Clockwork
    if (this.clockwork.has(file)) {
      clearInterval(this.clockwork.get(file));
      this.clockwork.delete(file);
    }

    // Clear Event Handlers
    this.events = this.events.filter(e => e.file != file);

    // Unload
    if (this.unload.has(file)) {
      this.unload.get(file)(this.bot);
      this.unload.delete(file);
    }

    // Clear Commands and Aliases
    this.commands = this.commands.filter(c => c.file != file);
    this.aliases = this.aliases.filter(c => c.file != file);

    // Clear cache and reload
    delete require.cache[require.resolve(file)];
    this.register(file);
  }
  catch(e) {
    console.error(e);
  }

  return this;
};

Handler.prototype.execute = function(command, msg, suffix) {
  try {
    if (this.commands.has(command)) {
      this.commandCount++;
      this.commands.get(command).execute(msg, suffix);
    } else if (this.aliases.has(command)) {
      this.commandCount++;
      this.aliases.get(command).execute(msg, suffix);
    }
  } catch(e) {
    u.alertError(msg, e);
  }
};

/***********************
**  MODULE CONTAINER  **
***********************/

const Module = function() {
  this.commands = [];
  this.events = new Collection();
  this.clockwork = null;
  this.unload = null;
  this.config = {};

  return this;
};

Module.prototype.addCommand = function(info) {
  this.commands.push(new Command(info));
  return this;
};

Module.prototype.addEvent = function(name, handler) {
  this.events.set("name", handler);
  return this;
};

Module.prototype.addClockwork = function(clockworkFunction) {
  this.clockwork = clockworkFunction;
  return this;
};

Module.prototype.setUnload = function(unload) {
  this.unload = unload;
  return this;
};

Module.prototype.locale = function(msg, text) {
  let locale = (msg.guild ? u.getSetting(msg.guild, "language") : "EN");
  if (!locales.has(locale)) {
    let data = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "./locales/", `locale_${locale}.json`)));
    locales.set(locale, data);
  }
  return locales.get(locale)[text];
};

/********************
**  COMMAND CLASS  **
********************/

const Command = function(info) {
  if (!info.name || !info.process) {
    throw("Commands must have the name and process properties.");
  }

  this.name = info.name;
  this.aliases = (info.aliases ? info.aliases : []);
  this.syntax = (info.syntax ? info.syntax : "");
  this.description = (info.description ? info.description : this.name + " " + this.syntax).trim();
  this.info = (info.info ? info.info : this.description);
  this.hidden = (info.hidden ? info.hidden : false);
  this.category = (info.category ? info.category : "General");
  this.permissions = (info.permissions ? info.permissions : () => true);
  this.process = info.process;

  this.file = null;

  return this;
};

Command.prototype.execute = function(msg, suffix) {
  if (this.permissions(msg)) this.process(msg, suffix);
};

/************************
**  SUPPORT FUNCTIONS  **
************************/

module.exports = {
  Module: Module,
  Handler: Handler
};
