var	mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var LeaderboardSchema = new Schema({
	bhid: String,
	name: String,
	region: String,
	board: {
		type: String,
		enum: ['1v1', '2v2']
	},
	rank: Number,
	rating: Number,
	games: Number,
	previous: Number,
	update: {
		type: Date,
		default: Date.now
	}
});

module.exports = mongoose.model("Leaderboard", LeaderboardSchema);
