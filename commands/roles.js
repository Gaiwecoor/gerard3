const Augur = require("augurbot"),
  u = require("../utils/utils");

async function roleMe(member, msg = null) {
  try {
    let guild = member.guild;
    let user = await Module.db.claim.getUser(member.id);
    if (user && user.bhid) {
      let { regionRoles, rankedRoles, clanRole, clanId } = await Module.db.server.getSettings(guild.id);
      let bh = require("brawlhalla-api")(Module.config.api.bh);
      let ranked = await bh.getPlayerRanked(user.bhid);
      let stats = await bh.getPlayerStats(user.bhid);
      let roles = [];

      if (ranked && ranked.tier && ranked.region) {

        // Region Role
        if (regionRoles && regionRoles.length > 0) {
          let regions = ["us-e", "us-w", "eu", "brz", "sea", "aus"];

          regions.forEach((region, i) => {
            if ((ranked.region.toLowerCase() == region.toLowerCase()) && regionRoles[i] && guild.roles.has(regionRoles[i]))
              roles.push(regionRoles[i]);
          });
        }

        // Ranked Role
        if (rankedRoles && rankedRoles.length > 0) {
          let ranks = [ "diamond", "platinum", "gold", "silver", "bronze", "tin" ];

          ranks.forEach((rank, i) => {
            if (ranked.tier.toLowerCase().startsWith(rank) && rankedRoles[i] && guild.roles.has(rankedRoles[i]))
              roles.push(rankedRoles[i]);
          });
        }
      }

      // Clan Role
      if (stats && stats.clan && stats.clan.clan_id && clanRole && (clanId == stats.clan.clan_id) && guild.roles.has(clanRole))
        roles.push(clanRole);

      // Apply
      if (roles.length > 0) {
        let removeRoles = [].concat(clanRole, rankedRoles, regionRoles).filter((r, i, a) => (!roles.includes(r) && member.roles.has(r) && (i == a.indexOf(r)) && member.guild.roles.has(r)));
        roles = roles.filter(r => !member.roles.has(r));

        for (let i = 0; i < roles.length; i++) await member.addRole(roles[i]);
        for (let i = 0; i < removeRoles.length; i++) await member.removeRole(removeRoles[i]);

        //if (msg) msg.reply(`I gave you the ${roles.map(r => guild.roles.get(r).name).join(", ")} role(s).`).then(u.clean);
        if (msg) msg.react("👌");
      } else if (msg) msg.reply("I couldn't find any roles to give you.").then(u.clean);
    }
    else if (msg) msg.reply("you need to `claim` your account first.").then(u.clean);
  } catch(e) { u.alertError(e, msg); }
  if (msg) u.clean(msg);
}

function canManage(msg) {
  if (msg.guild && msg.guild.members.get(msg.client.user.id).permissions.has("MANAGE_ROLES")) {
    let settings = Module.db.server.getSettings(msg.guild.id);
    if (
      (settings.regionRoles && settings.regionRoles.length > 0) ||
      (settings.rankedRoles && settings.rankedRoles.length > 0) ||
      (settings.clanRole && settings.clanId)
    ) return true;
  }
  return false;
}

const Module = new Augur.Module()
.addCommand({name: "roleme",
  aliases: ["addrole", "assignroles"],
  description: "Assigns ranked, regional, and clan roles based on your ranked stats.",
  category: "Profile",
  permissions: canManage,
  process: (msg) => roleMe(msg.member, msg)
})
.addCommand({name: "removeroles",
  description: "Removes ranked, regional, and clan roles.",
  category: "Profile",
  permissions: (msg) => canManage(msg) && !Module.db.server.getSetting(msg.guild, "enforceRoles"),
  process: (msg) => {

    let { regionRoles, rankedRoles, clanRole } = Module.db.server.getSettings(msg.guild.id);
    let roles = [].concat(clanRole, regionRoles, rankedRoles).filter(r => msg.member.roles.has(r));
    msg.member.removeRoles(roles);
    msg.react("👌");
    u.clean(msg);
  }
})
.addCommand({name: "updateclan",
  description: "Applies the clan role for those in your server's clan.",
  category: "Profile",
  permissions: (msg) => canManage(msg) && (msg.member.permissions.has("MANAGE_GUILD") || msg.member.permissions.has("ADMINISTRATOR")),
  process: async (msg) => {
    try {
      const settings = Module.db.server.getSettings(msg.guild.id);
      if (settings.clanRole && msg.guild.roles.has(settings.clanRole) && settings.clanId) {
        const bh = require("brawlhalla-api")(Module.config.api.bh);
        let clan = await bh.getClanStats(settings.clanId);
        if (clan && clan.clan && clan.clan.length > 0) {
          let guild = await msg.guild.fetchMembers();

          let clanMembers = clan.clan.map(m => m.brawlhalla_id);
          let users = (await Module.db.claim.getClanUsers(clanMembers)).map(u => u.discordId);

          // Add the role to members
          let updates = guild.members
          .filter(m => users.includes(m.id) || m.roles.has(settings.clanRole));
          let call = 0;
          let fns = [null, "addRole", "removeRole", null];

          for (let [key, member] of updates) {
            let state = 0;
            if (users.includes(member.id)) state += 1;
            if (member.roles.has(settings.clanRole)) state += 2;

            if (fns[state]) {
              setTimeout((member, fn, role) => {
                member[fn](role).catch(e => { u.alertError(e, msg); });
              }, 1200 * call++, member, fns[state], settings.clanRole);
            }
          }

          let m = await msg.channel.send(`Updating ${call} clan ${(call == 1 ? "role" : "roles")}. The process should be complete in approximately ${(call * 1.2 / 60).toFixed(1)} minutes.`);
          setTimeout((m) => {
            m.edit(`Clan role update complete! ${call} ${(call == 1 ? "role" : "roles")} updated.`);
          }, 1200 * call, m);

        } else msg.reply("your clan doesn't appear to have any members!").then(u.clean);
      } else msg.reply("you must first set your server's clan id and role at <https://gerard.vorpallongspear.com/manage>");
    } catch(e) { u.alertError(e, msg); }
  }
})
.addEvent("guildMemberAdd", async member => {
  try {
    if (canManage({guild: member.guild, client: member.client})) roleMe(member);
  } catch(e) { u.alertError(e); }
});

module.exports = Module;
