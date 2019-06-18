/*************************************************************************
**  Glory Calculators from http://www.brawlhalla.com/glory-calculator/  **
*************************************************************************/

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

module.exports = {
  GetGloryFromWins,
  GetGloryFromBestRating,
  GetHeroEloFromOldElo,
  GetPersonalEloFromOldElo,
  bestRating
};
