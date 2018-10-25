const mongoose = require("mongoose"),
  config = require("../config/config.json"),
  errorLog = require("../utils/utils").alertError,
  Claim = require("./Claim.model"),
  Command = require("./Command.model"),
  Leaderboard = require("./Leaderboard.model"),
  Server = require("./Server.model");

const serverSettings = new Map();

mongoose.connect(config.db.db, config.db.auth);

const models = {
  claim: {
    getUser: (discordId) => {
      return new Promise((fulfill, reject) => {
        Claim.findOne(
          { discordId: discordId },
          function(err, user) {
            if (err) reject(err);
            else fulfill(user);
          }
        );
      });
    },
    saveUser: (data) => {
      return new Promise((fulfill, reject) => {
        let fields = ["discordId", "bhid", "challonge", "twitch", "steamId", "public", "verified"];
        let params = {};
        for (option in data) {
          if (fields.includes(option)) params[option] = data[option];
        }

        if (!params.discordId) reject({error: "'discordId' is a required field."});
        else {
          Claim.findOneAndUpdate(
            { discordId: params.discordId },
            { $set: params },
            { upsert: true, new: true },
            function(err, user) {
              if (err) reject(err);
              else fulfill(user);
            }
          );
        }
      });
    },
    saveOptions: (discordId, data) => {
      return new Promise((fulfill, reject) => {
        let optionalData = ["steamId", "challonge", "public", "twitch", "bhid", "verified"];
        let params = {};

        for (option in data) {
          if (optionalData.includes(option)) params[option] = data[option];
        }

        Claim.findOneAndUpdate(
          { discordId: discordId },
          { $set: params },
          { upsert: true, new: true },
          function(err, user) {
            if (err) reject(err);
            else fulfill(user);
          }
        );
      });
    },
    removeClaim: (discordId) => {
      return new Promise((fulfill, reject) => {
        Claim.findOneAndRemove(
          { discordId: discordId },
          function(err, claim) {
            if (err) reject(err);
            else fulfill(claim);
          }
        );
      });
    }
  },
  commands: {
    addCommand: (data) => {
      return new Promise((fulfill, reject) => {
        Command.findOneAndUpdate(
          {serverId: data.serverId, command: data.command},
          {$set: {response: data.response, attachment: data.attachment}},
          {upsert: true, new: true},
          function (err, cmd) {
            if (err) reject(err);
            else {
              if (cmd.attachment) {
                let fs = require("fs");
                request(data.url).pipe(fs.createWriteStream(process.cwd() + "/storage/" + cmd._id));
              }
              fulfill(cmd);
            }
          }
        );
      });
    },
    fetchCommands: () => {
      return new Promise((fulfill, reject) => {
        Command.find({}, function(err, cmds) {
          if (err) reject(err);
          else fulfill(cmds);
        });
      });
    },
    removeCommand: (guild, command) => {
      return new Promise((fulfill, reject) => {
        Command.findOneAndRemove(
          {serverId: guild.id, command: command},
          function(err, cmd) {
            if (err) reject(err);
            else fulfill(cmd);
          }
        );
      });
    }
  },
  leaderboards: {
    fetchRankings: (region, page = 1) => {
      let bh = require("brawlhalla-api")(config.api.bh);
      ["1v1", "2v2"].forEach(board => {
        bh.getRankings({
          bracket: board,
          region: region,
          page: page
        }).then(rankings => {
          rankings.forEach(ranking => {
            let bhid = (ranking.brawlhalla_id ? ranking.brawlhalla_id : (ranking.brawlhalla_id_one + "+" + ranking.brawlhalla_id_two));
            Leaderboard.findOne({bhid: bhid}, (err, entry) => {
              if (err) errorLog(err);
              else {
                let options = {
                  name: (ranking.name ? ranking.name : ranking.teamname),
                  rank: ranking.rank,
                  board: board
                };

                if (!entry || ( entry.games != ranking.games )) {
                  options.games = ranking.games;
                  options.rating = ranking.rating;
                  options.update = Date.now();
                  options.previous = (entry ? entry.rating : 0);
                  options.region = ranking.region;
                }

                Leaderboard.findOneAndUpdate(
                  {bhid: bhid},
                  {$set: options},
                  {new: true, upsert: true},
                  (e, doc) => {
                    if (e) errorLog(e);
                  }
                );
              }
            });
          });
        }).catch(errorLog);
      });
    },
    fetchQueue: (region, board = "1v1", queueTime = 20) => {
      return new Promise((fulfill, reject) => {
        let since = new Date(Date.now() - (queueTime * 60 * 1000));
        Leaderboard.find({
          region: region.toUpperCase(),
          board: board,
          update: { $gte: since }
        })
        .sort({rank: 1})
        .limit(20)
        .exec((err, records) => {
          if (err) reject(err);
          else fulfill(records);
        });
      });
    }
  },
  server: {
    addServer: (guild) => {
      return new Promise((fulfill, reject) => {
				let newServer = new Server({
					serverId: guild.id
				});

				Server.findOneAndUpdate(
					{serverId: guild.id},
					{$set: {
						serverId: newServer.serverId,
						botspam: newServer.botspam,
						prefix: newServer.prefix,
            language: newServer.language
					}},
					{upsert: true, new: true},
					function(err, server) {
						if (err) reject(err);
						else {
              serverSettings.set(server.serverId, server);
              fulfill(server)
            };
					}
				);
			});
    },
    announceChannels: () => {
      return new Promise((fulfill, reject) => {
        Server.find({announce: {$ne: null}}, (err, servers) => {
          if (err) reject(err);
          else fulfill(servers);
        });
      });
    },
    getSetting: (guild, setting) => {
      if (serverSettings.has(guild.id))
        return serverSettings.get(guild.id)[setting];
      else {
        return new Promise((fulfill, reject) => {
          Server.findOne({serverId: guild.id}, (e, server) => {
  					if (e) reject({ error: e });
  					else if (server) {
              serverSettings.set(server.serverId, server)
              fulfill(serverSettings.get(server.serverId)[setting]);
            } else {
              models.server.addServer(guild).then(server => {
                fulfill(server[setting]);
              }).catch(reject);
            }
  				});
        });
      }
    },
    getSettings: (guildId) => {
      if (serverSettings.has(guildId))
        return serverSettings.get(guildId);
      else {
        return new Promise((fulfill, reject) => {
          Server.findOne({serverId: guildId}, (e, server) => {
            if (e) reject(e);
            else if (server) fulfill(server);
            else models.server.addServer({id: guildId}).then(fulfill, reject);
          });
        });
      }
    },
    refresh: (guildId) => {
      return new Promise((fulfill, reject) => {
        Server.findOne({serverId: guildId}, (e, server) => {
          if (e) reject(e);
          else if (server) {
            serverSettings.set(server.serverId, server);
            fulfill(server);
          }
        });
      });
    },
    saveSetting: (guild, setting, value) => {
      return new Promise((fulfill, reject) => {
				let updateOptions = {};
				updateOptions[setting] = value;
        serverSettings.get(guild.id)[setting] = value;
				Server.findOneAndUpdate(
					{serverId: guild.id},
					{$set: updateOptions},
					{upsert: true, new: true},
					(err, server) => {
						if (err) reject(err);
						else fulfill(server);
					}
				);
			});
    },
    saveSettings: (guild, settings) => {
      return new Promise((fulfill, reject) => {
        for (setting in settings) {
          serverSettings.get(guild.id)[setting] = settings[setting];
        }
        Server.findOneAndUpdate(
          {serverId: guild.id},
          {$set: settings},
          {upsert: true, new: true},
          (err, server) => {
            if (err) reject(err);
            else fulfill(server);
          }
        );
      });
    }
  },
  init: (bot) => {
    bot.guilds.forEach(guild => {
      Server.findOne({serverId: guild.id}, (e, server) => {
        if (!e && server) {
          serverSettings.set(server.serverId, server);
        } else {
          models.server.addServer(guild).then(server => {
            serverSettings.set(server.serverId, server);
          });
        }
      });
    });
  }
};

module.exports = models;
