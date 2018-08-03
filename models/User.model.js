var	mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var UserSchema = new Schema({
	discordId: String,
	language: {
    type: String,
    default: "EN"
  }
});

module.exports = mongoose.model("User", UserSchema);
