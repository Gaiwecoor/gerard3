const Augur = require("augurbot"),
  config = require("../config/config.json"),
  bh = require("brawlhalla-api")(config.api.bh),
  u = require("../utils/utils"),
  rankedResults = new Map(),
  time = 900000;

async function awaitNav(msg) {
  try {
    let { results, index, user, cache } = rankedResults.get(msg.id);
    let nav = ["◀", "▶"];

    await msg.react(nav[0]);
    await msg.react(nav[1]);

    let reactions = await msg.awaitReactions(
      (reaction, u) => u.id == user && nav.includes(reaction.emoji.name),
      { max: 1, time: time }
    );

    if (reactions.size == 0) {
      // Timeout. Clear reaction seeds.
      nav.forEach(n => msg.reactions.get(n).remove(msg.client.user.id));
    } else {
      // Navigate and update.
      index += (2 * nav.indexOf(reactions.first().emoji.name) - 1);
      if (index < 0) index += results.length;
      else if (index >= results.length) index %= results.length;
      rankedResults.set(msg.id, { results, index, user, cache });
      updateRankedEmbed(msg);
    }
  } catch(e) {
    if (msg.channel.guild && !msg.channel.permissionsFor(msg.client.user).has(["EMBED_LINKS", "ADD_REACTIONS"]))
      msg.channel.send(msg.author + ", my system requires `Add Reactions` permissions for me to function properly and it looks like I don't have those. Try talking to the server owner to make sure I have the permissions I need.");
    else u.alertError(e);
  }
}

async function getFullRank(result) {
  try {
    let rank = await bh.getPlayerRanked(result.brawlhalla_id);
    let stats = await bh.getPlayerStats(result.brawlhalla_id);

    rank.global_rank = result.rank;
    if (stats.clan && stats.clan.clan_name) rank.clan = stats.clan;
    return rank;
  } catch(e) { u.alertError(e); }
}

function rankedEmbed(rank, index = 0, count = null) {
  let embed = u.embed();
  let rankInfo = {
    diamond: {
      color: [73, 41, 183],
      image: "diamond"
    },
    platinum: {
      color: [0, 92, 154],
      image: "platinum"
    },
    gold: {
      color: [168, 9,30],
      image: "gold"
    },
    silver: {
      color: [103, 104, 105],
      image: "competitor"
    },
    bronze: {
      color: [103, 75, 36],
      image: "competitor"
    },
    tin: {
      color: [52, 83, 52],
      image: "competitor"
    }
  };

  rank.loss = rank.games - rank.wins;
  rank.winrate = ((rank.games > 0) ? (100 * rank.wins / rank.games).toFixed(1) : 0);
  rank["2v2"].sort((a, b) => b.rating - a.rating);
  rank.team = rank["2v2"][0];

  rank.legends.sort((a, b) => b.rating - a.rating);
  let bestLegend = rank.legends[0];

  rank.legends.sort((a, b) => b.games - a.games);

  for (var x in rankInfo) {
    if (rank.tier.toLowerCase().startsWith(x)) {
      embed.setColor(rankInfo[x].color)
      .setThumbnail(`${config.imgPath}/ranked/${rankInfo[x].image}.png?API_KEY=${config.api.resource}`);
      break;
    }
  }

  let name = `**${u.decode(rank.name)}**` + (rank.clan ? `\n< [${u.decode(rank.clan.clan_name)}](https://brawldb.com/clan/info/${rank.clan.clan_id}) >` : "");

  embed.setTitle(`${(rank.verified ? "☑️ Verified " : "")}Ranked Data for ${u.decode(rank.name)}`)
    .addField("Name", name, true)
    .addField("Region", rank.region, true)
    .addField("Legends", `Highest Rating: ${bh.legendSummaries.get(bestLegend.legend_id).bio_name}\nMost Played: ${bh.legendSummaries.get(rank.legends[0].legend_id).bio_name}`, true);

  if (count > 1)
    embed.setDescription(`Result ${(index + 1)} of ${count}. React with ◀ or ▶ within ${(time / 60000)} minutes to view other results.`);

  if (rank.power_ranking) {
    let pr = rank.power_ranking;
    let overall = pr.overall;
    let singles = pr["1v1"];
    let doubles = pr["2v2"];

    embed.addField(`__${pr.season} ${pr.year} Power Rankings__`, "\u200B");
    if (overall) embed.addField("Overall", `**Rank ${overall.rank}**\nTop 8: ${overall.top8}\nTop 32: ${overall.top32}\n:first_place: ${overall.gold} :second_place: ${overall.silver} :third_place: ${overall.bronze}`, true);
    if (singles) embed.addField("1v1", `**Rank ${singles.rank}**\nTop 8: ${singles.top8}\nTop 32: ${singles.top32}\n:first_place: ${singles.gold} :second_place: ${singles.silver} :third_place: ${singles.bronze}`, true);
    if (doubles) embed.addField("2v2", `**Rank ${doubles.rank}**\nTop 8: ${doubles.top8}\nTop 32: ${doubles.top32}\n:first_place: ${doubles.gold} :second_place: ${doubles.silver} :third_place: ${doubles.bronze}`, true);
  }

  embed.addField("__Ranked Play__", "\u200B")
  .addField("1v1 Rating", `**${rank.tier}** (${rank.rating} / ${rank.peak_rating} Peak)\n${rank.winrate}% Winrate` + (rank.global_rank ? `\n**Global Rank** ${rank.global_rank}` : "") + (rank.region_rank ? `\n**${rank.region} Rank** ${rank.region_rank}` : ""), true);

  if (rank.team) {
    rank.team.loss = rank.team.games - rank.team.wins;
    rank.team.winrate = ((rank.team.games > 0) ? (100 * rank.team.wins / rank.team.games).toFixed(1) : 0);

    try {
      embed
      .addField("2v2 Team Rating", `**${u.decode(rank.team.teamname)}**\n**${rank.team.tier}** (${rank.team.rating} / ${rank.team.peak_rating} Peak)\n${rank.team.wins} Wins / ${rank.team.loss} Losses (${rank.team.games} Games)\n${rank.team.winrate}% Winrate`, true);
    } catch(e) { console.error(e); }
  }

  embed.addField("More Stats Available On:", statSites(rank.brawlhalla_id));

  return embed;
}

function statEmbed(stats) {
  let weaponStat = function(name) {
    let self = this;
    this.name = name;
    this.wins = 0;
    this.games = 0;
    this.kos = 0;
    this.damage = 0;
    this.timeheld = 0;

    this.ttk = () => (self.timeheld / self.kos).toFixed(1);
    this.dps = () => (self.damage / self.timeheld).toFixed(1);
    this.time = () => self.timeheld;
    this.wr = () => (100 * self.wins / self.games).toFixed(1);

    this.addStats = (legend) => {
      ["one", "two"].forEach(i => {
        if (bh.legendSummaries.get(legend.legend_id)[`weapon_${i}`] == self.name) {
          self.wins += legend.wins;
          self.games += legend.games;

          self.kos += legend[`koweapon${i}`];
          self.damage += parseInt(legend[`damageweapon${i}`], 10);
          self.timeheld += legend[`timeheldweapon${i}`];
        }
      });
    };
  };

  let weaponStats = bh.weapons.map(w => new weaponStat(w));

  stats.legends.forEach(legend => {
    legend.ttk = (legend.matchtime / legend.kos).toFixed(1);
    legend.dps = (legend.damagedealt / legend.matchtime).toFixed(1);
    legend.time = legend.matchtime;
    legend.wr = (100 * legend.wins / legend.games).toFixed(1);

    weaponStats.find(w => w.name == bh.legendSummaries.get(legend.legend_id).weapon_one).addStats(legend);
    weaponStats.find(w => w.name == bh.legendSummaries.get(legend.legend_id).weapon_two).addStats(legend);
  });

  let sort = {
    time: -1,
    wr: -1,
    dps: -1,
    ttk: 1
  };

  let response = { legend: {}, weapon: {} };

  for (stat in sort) {
    let legend = stats.legends.filter(l => l.games > 20).sort((a, b) => (a[stat] == b[stat] ? (b.time - a.time) : (a[stat] - b[stat]) * sort[stat]))[0];
    let weapon = weaponStats.filter(w => w.timeheld != 0 && w.games > 20).sort((a, b) => (a[stat]() == b[stat]() ? b.time() - a.time() : (a[stat]() - b[stat]()) * sort[stat]))[0];

    if (legend) {
      response.legend[stat] = {
        name: bh.legendSummaries.get(legend.legend_id).bio_name,
        value: legend[stat]
      };
    }
    if (weapon) {
      response.weapon[stat] = {
        name: weapon.name,
        value: weapon[stat]()
      };
    }
  }

  let embed = u.embed()
  .setTitle(`${(stats.verified ? "☑️ Verified " : "")}Brawlhalla Stats for ${u.decode(stats.name)}`)
  .addField("Name", `**${u.decode(stats.name)}**` + (stats.clan ? (`\n< [${u.decode(stats.clan.clan_name)}](https://brawldb.com/clan/info/${stats.clan.clan_id}) >`) : ""), true)
  .addField("Overall", [
    `${stats.wins} Wins / ${stats.games - stats.wins} Losses (${stats.games} Games)`,
    `${(100 * stats.wins / stats.games).toFixed(1)}% Winrate`
  ].join("\n"), true)
  .addField("Legends (20 game minimum)", [
    "**Most Used:** " + (response.legend.time ? response.legend.time.name : "None"),
    "**Highest Winrate:** " + (response.legend.wr ? `${response.legend.wr.name} (${response.legend.wr.value}%)` : "None"),
    "**Highest Avg DPS:** " + (response.legend.dps ? `${response.legend.dps.name} (${response.legend.dps.value})` : "None"),
    "**Shortest Avg TTK:** " + (response.legend.ttk ? `${response.legend.ttk.name} (${response.legend.ttk.value}s)` : "None")
  ].join("\n"), true)
  .addField("Weapons (20 game minimum)", [
    "**Most Used:** " + (response.weapon.time ? response.weapon.time.name : "None"),
    "**Highest Winrate (Legends Using Weapon):** " + (response.weapon.wr ? `${response.weapon.wr.name} (${response.weapon.wr.value}%)` : "None"),
    "**Highest Avg DPS:** " + (response.weapon.dps ? `${response.weapon.dps.name} (${response.weapon.dps.value})` : "None"),
    "**Shortest Avg TTK:** " + (response.weapon.ttk ? `${response.weapon.ttk.name} (${response.weapon.ttk.value}s)` : "None")
  ].join("\n"), true)
  .addField("More Stats Available On:", statSites(stats.brawlhalla_id));

  return embed;
}

function statSites(bhid) {
  let sites = {
		"BrawlDB": "https://brawldb.com/player/stats?bhId=",
		"BrawlBay": "https://www.brawlbay.com/result/?ident=",
		"Brawlmance": "https://brawlmance.com/search?brawlhalla_id="
	}
	return Object.keys(sites).map(site => `[${site}](${sites[site]}${bhid})`).join("\n");
}

async function updateRankedEmbed(msg) {
  try {
    let { results, index, user, cache } = rankedResults.get(msg.id);
    let rank = null;

    if (cache[index]) {
      rank = cache[index];
    } else {
      rank = await getFullRank(results[index]);
      cache[index] = rank;
    }

    let channel = msg.channel;

    let m = null;
    if (channel.permissionsFor(msg.client.user).has("MANAGE_MESSAGES")) {
      await msg.clearReactions();
      m = await msg.edit(rankedEmbed(rank, index, results.length));
    } else {
      msg.delete();
      m = await channel.send(rankedEmbed(rank, index, results.length));
      rankedResults.set(m.id, { results, index, user, cache });
      rankedResults.delete(msg.id);
    }
    if (m) awaitNav(m);
  } catch(e) {
    if (msg.channel.guild && !msg.channel.permissionsFor(msg.client.user).has(["EMBED_LINKS", "ADD_REACTIONS"]))
      msg.channel.send(msg.author + ", my system requires `Embed Links` and `Add Reactions` permissions for me to function properly and it looks like I don't have those. Try talking to the server owner to make sure I have the permissions I need.");
    else u.alertError(e, msg);
  }
}

const Module = new Augur.Module()
.addCommand({name: "rank",
  description: "Fetch user rankings",
  usage: "[@user]",
  info: "Retrieves rankings for a mentioned user (if they have `claim`ed their profile) or the Steam name you specify.",
  aliases: ["elo", "ranking", "rankings"],
  category: "Stats",
  process: async (msg, suffix) => {
    try {
      let userMentions = u.userMentions(msg);
      let target = null;
      if (userMentions) target = userMentions.first();
      else if (!suffix) target = msg.author;

      if (target) {
        // Get by mention
        let embed = null;
        let claim = Module.db.claim;
        let user = await claim.getUser(target.id);
        if (user && user.bhid && ((user.discordId == msg.author.id) || user.public)) {
          let rank = await bh.getPlayerRanked(user.bhid);
          let stats = await bh.getPlayerStats(user.bhid);

          if (rank.rating) {
            // User is ranked in the current season.
            let leaderboard = await bh.getRankings({name: u.decode(rank.name)});
            let leaderrank = leaderboard.find(l => l.brawlhalla_id == rank.brawlhalla_id);
            if (leaderrank) rank.global_rank = leaderrank.rank;
            if (stats.clan && stats.clan.clan_name) rank.clan = stats.clan;

            if (user.verified) rank.verified = true;
            embed = rankedEmbed(rank);
          } else {
            // User is currently unranked.
            if (user.verified) stats.verified = true;
            embed = statEmbed(stats)
            .setDescription("This player is currently unranked.\n\nBrawlhalla stats since September 2016.");
          }

          let channel = u.botSpam(msg);
          channel.send(embed).catch(e => {
            if (channel.guild && !channel.permissionsFor(msg.client.user).has("EMBED_LINKS"))
              channel.send(msg.author + ", my system requires `Embed Links` permissions for me to function properly and it looks like I don't have those. Try talking to the server owner to make sure I have the permissions I need.");
            else u.alertError(e, msg);
          });
        } else if (user && user.bhid) {
          msg.reply("that user's profile is not public.").then(u.clean);
        } else if (target.id == msg.author.id) {
          msg.reply("you need to `claim` your profile first.").then(u.clean);
        } else {
          msg.reply("that user hasn't `claim`ed their profile.").then(u.clean);
        }
      }
      else {
        // Search by name
        let results = await bh.getRankings({name: suffix});
        results = results.filter(r => u.decode(r.name).toLowerCase() == suffix.toLowerCase());

        if (results.length > 0) {
          let result = results[0];

          let rank = await getFullRank(result);

          let channel = u.botSpam(msg);
          try {
            let m = await channel.send(rankedEmbed(rank, 0, results.length));
            if (results.length > 1) {
              rankedResults.set(m.id, {
                results: results,
                index: 0,
                user: msg.author.id,
                cache: [rank]
              });
              awaitNav(m);
            }
          } catch(e) {
            if (channel && channel.guild && !channel.permissionsFor(msg.client.user).has(["EMBED_LINKS", "ADD_REACTIONS"]))
              channel.send(msg.author + ", my system requires `Embed Links` and `Add Reactions` permissions for me to function properly and it looks like I don't have those. Try talking to the server owner to make sure I have the permissions I need.");
            else u.alertError(e, msg);
          }
        } else msg.reply(`I couldn't find any results for ${suffix}.`).then(u.clean);
      }
    } catch(e) { u.alertError(e, msg); }
  }
})
.addCommand({name: "rankbyid",
  description: "Fetch user rankings by Brawlhalla ID",
  usage: "[bhid]",
  info: "Retrieves rankings for a particular Brawlhalla ID.",
  category: "Stats",
  hidden: true,
  process: async (msg, suffix) => {
    try {
      let bhid = parseInt(suffix, 10);

      if (bhid) {
        // Get by mention
        let embed = null;

        let rank = await bh.getPlayerRanked(bhid);
        let stats = await bh.getPlayerStats(bhid);

        if (rank.rating) {
          // User is ranked in the current season.
          let leaderboard = await bh.getRankings({name: u.decode(rank.name)});
          let leaderrank = leaderboard.find(l => l.brawlhalla_id == rank.brawlhalla_id);
          if (leaderrank) rank.global_rank = leaderrank.rank;
          if (stats.clan && stats.clan.clan_name) rank.clan = stats.clan;

          embed = rankedEmbed(rank);
        } else {
          // User is currently unranked.
          embed = statEmbed(stats)
          .setDescription("This player is currently unranked.\n\nBrawlhalla stats since September 2016.");
        }

        let channel = u.botSpam(msg);
        channel.send(embed).catch(e => {
          if (channel.guild && !channel.permissionsFor(msg.client.user).has("EMBED_LINKS"))
            channel.send(msg.author + ", my system requires `Embed Links` permissions for me to function properly and it looks like I don't have those. Try talking to the server owner to make sure I have the permissions I need.");
          else u.alertError(e, msg);
        });
      }
      else msg.reply("you need to tell me which Brawlhalla ID to search!").then(u.clean);
    } catch(e) { u.alertError(e, msg); }
  }
})
.addCommand({name: "stats",
  description: "Fetch user statistics",
  usage: "[@user] | bhid",
  info: "Retrieves stats for a mentioned user (if they have `claim`ed their profile) or a given Brawlhalla ID.",
  category: "Stats",
  process: async (msg, suffix) => {
    try {
      let userMentions = u.userMentions(msg);
      let target = null;
      if (userMentions) target = userMentions.first();
      else if (!suffix) target = msg.author;
      let embed = null;

      if (target) {
        // Get by mention
        let claim = Module.db.claim;
        let user = await claim.getUser(target.id);
        if (user && user.bhid && ((user.discordId == msg.author.id) || user.public)) {
          let stats = await bh.getPlayerStats(user.bhid);
          if (user.verified) stats.verified = true;
          embed = statEmbed(stats)
          .setDescription("Brawlhalla stats since September 2016.");
        } else if (user && user.bhid) {
          msg.reply("that user's profile is not public.").then(u.clean);
        } else if (target.id == msg.author.id) {
          msg.reply("you need to `claim` your profile first.").then(u.clean);
        } else {
          msg.reply("that user hasn't `claim`ed their profile.").then(u.clean);
        }
      }
      else {
        // Search by BHID
        let bhid = parseInt(suffix, 10);
        if (bhid) {
          try {
            let stats = await bh.getPlayerStats(bhid);
            if (stats.brawlhalla_id) {
              embed = statEmbed(stats).setDescription("Brawlhalla Stats since September 2016");
            } else
              msg.reply("I couldn't find any stats for that Brawlhalla ID.").then(u.clean);
          } catch(e) { u.alertError(e, msg); }
        } else msg.reply("you need to give me a valid Brawlhalla ID.").then(u.clean);
      }

      if (embed) {
        let channel = u.botSpam(msg);
        channel.send(embed).catch(e => {
          if (channel.guild && !channel.permissionsFor(msg.client.user).has("EMBED_LINKS"))
          channel.send(msg.author + ", my system requires `Embed Links` permissions for me to function properly and it looks like I don't have those. Try talking to the server owner to make sure I have the permissions I need.");
          else u.alertError(e, msg);
        });
      }
    } catch(e) { u.alertError(e, msg); }
  }
});

module.exports = Module;
