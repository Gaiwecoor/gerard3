const Augur = require("augurbot"),
	u = require("../utils/utils");

// Glory Calculators from http://www.brawlhalla.com/glory-calculator/

function GetGloryFromWins(totalwins) {
	if(totalwins<=150) return 20*totalwins;
	return Math.floor((10*(45*Math.pow(Math.log10(totalwins*2),2)))+245);
}
function GetGloryFromBestRating(bestrating) {
	var retval=0;
	if(bestrating<1200) retval=250;
	if(bestrating>=1200&&bestrating<1286) retval=10*(25+((0.872093023)*(86-(1286-bestrating))));
	if(bestrating>=1286&&bestrating<1390) retval=10*(100+((0.721153846)*(104-(1390-bestrating))));
	if(bestrating>=1390&&bestrating<1680) retval=10*(187+((0.389655172)*(290-(1680-bestrating))));
	if(bestrating>=1680&&bestrating<2000) retval=10*(300+((0.428125)*(320-(2000-bestrating))));
	if(bestrating>=2000&&bestrating<2300) retval=10*(437+((0.143333333)*(300-(2300-bestrating))));
	if(bestrating>=2300) retval=10*(480+((0.05)*(400-(2700-bestrating))));
	return Math.floor(retval);
}
function GetHeroEloFromOldElo(elo) {
	if(elo<2000) return Math.floor((elo+375)/1.5);
	return Math.floor(1583+(elo-2000)/10)
}
function GetPersonalEloFromOldElo(elo) {
	if(elo>=1400) return Math.floor(1400+(elo-1400.0)/(3.0-(3000-elo)/800.0));
	return elo;
}

function bestRating(rank) {
	let ratings = [rank].concat(rank.legends);
	if (rank["2v2"] && (rank["2v2"].length > 0)) ratings = ratings.concat(rank["2v2"]);
	ratings = ratings.map(r => r.peak_rating);
	return Math.max(...ratings);
}

const Module = new Augur.Module()
.addCommand({name: "glory",
	description: "Get an *estimate* of the amount of Glory you'll receive at the end of the current ranked season.",
	info: "Glory is awarded based on a combination of ranked wins and peak rating across all ranked game modes.",
	category: "Stats",
	process: async (msg) => {
		try {
			let userMentions = u.userMentions(msg);
      let target = (userMentions ? userMentions.first() : msg.author);

      let user = await Module.db.claim.getUser(target.id);
      if (user && user.bhid && ((user.discordId == msg.author.id) || user.public)) {
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
				msg.reply("you need to claim your account before I can estimate your Glory.").then(u.clean);
			} else {
				msg.reply("you need to `claim` your profile first.").then(u.clean);
			}
		} catch(e) { u.alertError(e, msg); }
	}
});

module.exports = Module;
