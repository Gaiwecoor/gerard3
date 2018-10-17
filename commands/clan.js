const Augur = require("augurbot"),
  u = require("../utils/utils");

function clanEmbed(clan) {
  let embed = u.embed()
    .setTitle(u.decode(clan.clan_name))
    .setURL(`https://brawldb.com/clan/info/${clan.clan_id}`)
    .setDescription(`__**Clan Information**__\n**Created:** ${(new Date(clan.clan_create_date * 1000)).toLocaleDateString("en-US")}\n**Experience:** ${clan.clan_xp}\n**Members:** ${clan.clan.length}`);

  clan.clan.sort(clanSort).filter((m, i) => i < 24).forEach(member => {
    embed.addField(u.decode(member.name), `${member.rank} (${member.xp} xp)\nJoined ${(new Date(member.join_date * 1000)).toLocaleDateString("en-US")}`, true);
  });

  if (clan.clan.length > 24) embed.addField("More Members...", `All clan members are visible on [BrawlDB](https://brawldb.com/clan/info/${clan.clan_id})`);

  return embed;
}

function clanSort(a, b) {
  let ranks = {
    "Leader": 3,
    "Officer": 2,
    "Member": 1,
    "Recruit": 0
  }
  if (a.rank == b.rank) return b.xp - a.xp;
  else return ranks[b.rank] - ranks[a.rank];
}

const Module = new Augur.Module()
.addCommand({name: "clan",
  category: "Stats",
  description: "Stats about a clan.",
  syntax: "[@user]",
  info: "Clan stats for the mentioned user.",
  process: async (msg) => {
    try {
      let bh = require("brawlhalla-api")(Module.config.api.bh);

      let mentions = u.userMentions(msg);
      let target = (mentions ? mentions.first() : msg.author);

      let user = await Module.db.claim.getUser(target.id);

      if (user && user.bhid && (user.public || user.discordId == msg.author.id)) {
        let stats = await bh.getPlayerStats(user.bhid);
        if (stats && stats.clan) {
          let clan = await bh.getClanStats(stats.clan.clan_id);

          let channel = u.botSpam(msg);
          channel.send(clanEmbed(clan)).catch(e => {
      			if (msg.guild && !channel.permissionsFor(bot.user).has("EMBED_LINKS")) {
      				channel.send(msg.author + ", my system requires `Embed Links` permissions for me to work properly, and it looks like I don't have those. Try talking to the server owner to make sure I have the permissions I need.");
      			} else u.alertError(e, msg);
      		});
        } else if (stats && !stats.clan) msg.channel.send(`${stats.name} doesn't have a clan.`).then(u.clean);
        else msg.channel.send("I couldn't get any Brawlhalla info for " + target.username).then(u.clean);
      } else if (user && !user.public) msg.channel.send(`${target.username}'s profile is not public.`).then(u.clean);
      else msg.channel.send(`${target.username} hasn't claimed their profile yet!`).then(u.clean);
    } catch(e) { u.alertError(e, msg); }
  }
});

module.exports = Module;
