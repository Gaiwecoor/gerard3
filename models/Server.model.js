var	mongoose = require('mongoose'),
	config = require('../config/config.json'),
	Schema = mongoose.Schema;

var ServerSchema = new Schema({
	serverId: {
		type: String,
		required: true
	},
	botspam: {
		type: String,
		default: null
	},
	prefix: {
		type: String,
		default: config.prefix
	},
	announce: {
		type: String,
		default: null
	},
	rankedRoles: [String],
	regionRoles: [String],
	challonge: {
		type: String,
		default: null
	},
  language: {
    type: String,
    default: "EN"
  }
});

module.exports = mongoose.model("Server", ServerSchema);
