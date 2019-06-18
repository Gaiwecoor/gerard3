const Augur = require("augurbot"),
	u = require("../utils/utils"),
	{
	  GetGloryFromWins,
	  GetGloryFromBestRating,
	  GetHeroEloFromOldElo,
	  GetPersonalEloFromOldElo,
	  bestRating
	} = require("../utils/glory");

const Module = new Augur.Module()
.addCommand({name: "glory",
	description: "Get an *estimate* of the amount of Glory you'll receive at the end of the current ranked season.",
	info: "Get an *estimate* of the amount of Glory you'll receive at the end of the current ranked season.\n\nGlory is awarded based on a combination of ranked wins and peak rating across all ranked game modes.",
	category: "Stats",
	process: async (msg) => {
		try {
			let userMentions = u.userMentions(msg);
      let target = (userMentions ? userMentions.first() : msg.author);

      let user = await Module.db.claim.getUser(target.id);
      if (user && user.bhid && ((user.discordId == msg.author.id) || user.public)) {
				let bh = require("brawlhalla-api")(Module.config.api.bh);
				let rank = await bh.getPlayerRanked(user.bhid);

				if (rank) {
					let wins = rank.wins;
					let games = rank.games;

					if (rank["2v2"] && (rank["2v2"].length > 0)) {
						rank["2v2"].forEach(r => {
							wins += r.wins;
							games += r.games;
						});
					}

					if (games >= 10) {
						rank.name = u.decode(rank.name);
						let best = bestRating(rank);

						let glory = {
							rating: GetGloryFromBestRating(best),
							wins: GetGloryFromWins(wins)
						};

						let newRating = GetPersonalEloFromOldElo(rank.rating);

						let embed = u.embed()
						.setColor("#0e3e5b")
						.setTitle(`${rank.name} Estimated Ranked Glory`)
						.setDescription(`${rank.name}'s estimated Glory and 1v1 rating after the ranked season reset are:`)
						//.addField("Participation", `__**Games Played:**__ ${games}\n__**Total Wins:**__ ${wins}\n__**Peak Rating:**__ ${best}\n__**Current Rating:**__ ${rank.rating}`)
						.addField("Estimated Glory", glory.rating + glory.wins, true)
						.addField("Estimated Reset Rating", newRating, true)
						.setURL("http://www.brawlhalla.com/glory-calculator/");

						u.botSpam(msg).send(embed);
					} else
						u.botSpam(msg).send(msg.author + ", a player must play at least **10** ranked games each season to earn Glory!");
				} else u.botSpam(msg).send(msg.author + ", I couldn't find ranked info for " + target.username);
			} else if (user && user.bhid) {
				msg.reply("that user's profile is not public.").then(u.clean);
			} else if (target.id != msg.author.id) {
				msg.reply("that user needs to `claim` their account before I can estimate their Glory. Glory can also be calculated online, here: <http://www.brawlhalla.com/glory-calculator/>").then(u.clean);
			} else {
				msg.reply("you need to `claim` your profile first. Glory can also be calculated online, here: <http://www.brawlhalla.com/glory-calculator/>").then(u.clean);
			}
		} catch(e) { u.alertError(e, msg); }
	}
});

module.exports = Module;
