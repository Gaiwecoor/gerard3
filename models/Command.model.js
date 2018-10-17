var	mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var CommandSchema = new Schema({
	serverId: String,
	command: String,
	response: String,
	attachment: String
});

module.exports = mongoose.model("Command", CommandSchema);
