var	mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var	ClaimSchema = new Schema({
	discordId: {
		type: String,
		required: true
	},
	steamId: {
		type: String,
		default: null
	},
	bhid: {
		type: Number,
		default: null
	},
	challonge: {
		type: String,
		default: null
	},
	twitch: {
		type: String,
		default: null
	},
	public: {
		type: Boolean,
		default: true
	}
});

module.exports = mongoose.model('Claim', ClaimSchema);
