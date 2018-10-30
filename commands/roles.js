const Augur = require("augurbot"),
  u = require("../utils/utils");

const Module = new Augur.Module()
.addCommand({name: "assignroles",
  aliases: ["roleme", "addrole"],
  description: "Assigns ranked or regional roles based on your ranked stats.",
  category: "Profile",
  permissions: (msg) => msg.guild && msg.guild.members.get(msg.client.user.id).permissions.has("MANAGE_ROLES") && ((Module.db.server.getSettings(msg.guild.id).regionRoles && Module.db.server.getSettings(msg.guild.id).regionRoles.length > 0) || (Module.db.server.getSettings(msg.guild.id).rankedRoles && Module.db.server.getSettings(msg.guild.id).rankedRoles.length > 0)),
  process: async (msg) => {
    try {
      let user = await Module.db.claim.getUser(msg.author.id);
      if (user && user.bhid) {
        let { regionRoles, rankedRoles } = await Module.db.server.getSettings(msg.guild.id);
        let bh = require("brawlhalla-api")(Module.config.api.bh);
        let ranked = await bh.getPlayerRanked(user.bhid);

        if (ranked && ranked.tier && ranked.region) {
          let roles = [];
          if (regionRoles && regionRoles.length > 0) {
            let regions = Object.keys(bh.regions);

            regions.forEach((region, i) => {
              if ((ranked.region.toLowerCase() == region.toLowerCase()) && regionRoles[i]) {
                let role = msg.guild.roles.get(regionRoles[i]);
                if (role) {
                  msg.member.addRole(role);
                  roles.push(role);
                }
              }
            });
          }
          if (rankedRoles && rankedRoles.length > 0) {
            let ranks = [ "diamond", "platinum", "gold", "silver", "bronze", "tin" ];

            ranks.forEach((rank, i) => {
              if (ranked.tier.toLowerCase().startsWith(rank) && rankedRoles[i]) {
                let role = msg.guild.roles.get(rankedRoles[i]);
                if (role) {
                  msg.member.addRole(rankedRoles[i]);
                  roles.push(role);
                }
              }
            });
          }
          if (roles.length > 0) msg.reply(`I gave you the ${roles.map(r => r.name).join(" and ")} role(s).`).then(u.clean);
          else msg.reply("I couldn't find any roles to give you.").then(u.clean);
        }
        else msg.reply("you need to play at least one ranked game this season before I can apply roles.").then(u.clean);
      }
      else msg.reply("you need to `claim` your account first.").then(u.clean);
    } catch(e) { u.alertError(e, msg); }
  }
});

module.exports = Module;
