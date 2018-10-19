const Augur = require("augurbot"),
  u = require("../utils/utils");

const Module = new Augur.Module()
.addCommand({name: "claim",
  description: "Claim your Brawlhalla profile",
  category: "Profile",
  info: "Takes you to your profile page, to store your Steam and Brawlhalla ID, so you can access rank and stat info without having to type your name.",
  process: async (msg) => {
    try {
      u.botSpam(msg).send("Claim your Steam and Brawlhalla accounts here: <" + Module.config.homePage + "profile>");
    } catch(e) { u.alertError(e, msg); }
  }
})
.addCommand({name: "private",
  description: "Make your claimed account private",
  aliases: ["privacy"],
  category: "Profile",
  syntax: "on (default) | off",
  info: "Sets your privacy status on whether other users can mention your account to get your information.",
  process: async (msg, suffix) => {
    try {
      let state = ((suffix.toLowerCase() == "off") ? "true" : "false");

      let user = await Module.db.claim.saveOptions(msg.author.id, {public: state});
      msg.channel.send("Your privacy setting has been set to: " + (!user.public)).then(u.clean);
    } catch(e) { Module.handler.errorHandler(e, msg); }
  }
})
.addCommand({name: "steam",
  description: "Show your Steam profile",
  aliases: ["profile", "ign", "addme"],
  category: "Profile",
  process: async (msg) => {
    try {
      let request = require("request");
      let parseXML = require("xml2js").parseString;

      let user = await Module.db.claim.getUser(msg.author.id);
      if (user && user.steamId) {
        request(`https://steamcommunity.com/profiles/${user.steamId}?xml=1`, (error, response, body) => {
          let info = {
            name: (msg.member ? msg.member.displayName : msg.author.username),
            link: "https://steamcommunity.com/profile/" + user.steamId
          }
          if (!error && response.statusCode == 200) {
            parseXML(body, (err, xml) => {
              if (!err && xml.profile && xml.profile.steamID64) {
                let profile = xml.profile;
                if (profile.customURL && profile.customURL[0] != "")
                  info.link = "https://steamcommunity.com/id/" + profile.customURL[0];
                msg.channel.send(`**${info.name}'s Steam Profile:**\n__${profile.steamID[0]}__\n${info.link}`);
              } else msg.channel.send(`**${info.name}'s Steam Profile:**\n${info.link}`);
            });
          } else msg.channel.send(`**${info.name}'s Steam Profile: **\n${info.link}`);
        });
      } else msg.reply("you need to claim your Steam profile with `!claim <yourSteamId>`");
    } catch(e) { Module.handler.errorHandler(e, msg); }
  }
})
.addCommand({name: "unclaim",
  description: "Unclaim your account profiles.",
  category: "Profile",
  info: "Removes your account profiles from Gerard's memory.",
  process: async (msg) => {
    try {
      await Module.db.claim.removeClaim(msg.author.id);
      msg.channel.send("Your account profiles have been unclaimed!");
    } catch(e) { Module.handler.errorHandler(e, msg); }
  }
});

module.exports = Module;

/*async function oldClaim(msg, id) {
  try {
    if (id) {
      let bh = require("brawlhalla-api")(Module.config.api.bh);
      let SteamApi = require("steamapi");
      let steam = new SteamApi(Module.config.api.steam);
      let claim = Module.db.claim;

      let userIds = { discordId: msg.author.id };

      if (id.startsWith("<") && id.endsWith(">")) id = id.substr(1, id.length-2);

      let steamId = await steam.resolve(id);

      if (steamId) {
        let profileId = await bh.getBhidBySteamId(steamId);
        if (profileId && profileId.brawlhalla_id) {
          userIds.bhid = profileId.brawlhalla_id;
          userIds.steamId = profileId.steamId;
        }
      } else {
        let stats = await bh.getPlayerStats(id);
        if (stats && stats.brawlhalla_id) {
          userIds.bhid = stats.brawlhalla_id;
        }
      }

      if (userIds.bhid) {
        let user = await claim.saveUser(userIds);
        if (user && user.bhid) msg.channel.send(`Your Brawlhalla ${(user.steamId ? "and Steam IDs have" : "ID has")} been saved!`).then(u.clean);
        else msg.channel.send("Sorry, I ran into an error and couldn't save your profile.").then(u.clean);
      } else {
        msg.channel.send("Sorry, I couldn't find a Brawlhalla account associated with that ID.").then(u.clean);
      }
    } else msg.reply("you need to give me a Brawlhalla or Steam ID!").then(u.clean);
  } catch(e) { u.alertError(e, msg); }
}*/
