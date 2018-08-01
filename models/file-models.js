// Model system for file storage.
// DO NOT USE FOR SHARDED BOTS

const fs = require("fs"),
  config = require("../config/config.json"),
  files = {
    servers: process.cwd() + "/data/servers.json"
  },
  serverSettings = new Map();

var update = false;

// Safe save for filesystem settings.
setTimeout(() => {
  if (update) {
    let data = JSON.parse(fs.readFileSync(files.servers));
    serverSettings.forEach((server, id) => {
      data[id] = server;
    });
    fs.writeFile(files.servers, JSON.stringify(data), (err) => {
      if (err) console.error(err);
      else {
        update = false;
        console.log("Settings saved.");
      }
    });
  }
}, 60000);

module.exports = {
  getSetting: function(guild, setting) {
    if (serverSettings.has(guild.id)) {
      return serverSettings.get(guild.id)[setting];
    } else {
      let data = JSON.parse(fs.readFileSync(files.servers));
      if (data[guild.id]) {
        serverSettings.set(guild.id, data[guild.id]);
        return data[guild.id][setting];
      } else {
        let defaultSettings = {
          serverId: guild.id,
          prefix: config.prefix,
          botspam: null,
          language: "EN"
        };
        serverSettings.set(guild.id, defaultSettings);
        update = true;
        return defaultSettings[setting];
      }
    }
  },
  saveSetting: function(guild, setting, value) {
    if (serverSettings.has(guild.id)) {
      serverSettings.get(guild.id)[setting] = value;
    } else {
      let data = JSON.parse(fs.readFileSync(files.servers));
      if (data[guild.id]) {
        data[guild.id][setting] = value;
        serverSettings.set(guild.id, data[guild.id]);
      } else {
        let defaultSettings = {
          serverId: guild.id,
          prefix: config.prefix,
          botspam: null,
          language: "EN"
        };
        defaultSettings[setting] = value;
        serverSettings.set(guild.id, defaultSettings);
      }
    }
    update = true;
  }
};
