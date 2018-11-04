const Augur = require("augurbot"),
  u = require("../utils/utils");

const Module = new Augur.Module()
.addCommand({name: "about",
  description: "About me",
  category: "Bot Info",
  process: (msg) => {
  	let embed = u.embed()
  		.setURL(Module.config.helpPage)
  		.setThumbnail(msg.client.user.displayAvatarURL)
  		.setTitle(msg.client.user.username + ": A Brawlhalla Utility Bot")
  		.addField("Author", "[@Gaiwecoor](https://twitter.com/gaiwecoor)", true)
  		.addField("Help Page", `[${msg.client.user.username} About Page](${Module.config.helpPage})`, true)
  		.addField("Home Server", `[VLS Bot Support](${Module.config.homeServer})`, true)
  		.addField("Invite Link", `[Bring ${msg.client.user.username} to your server](${Module.config.inviteLink})`, true)
  		.addField("Patreon", "[Patreon](https://www.patreon.com/gaiwecoor)");

  	msg.channel.send(embed).catch(e => {
			if (msg.guild && !msg.channel.permissionsFor(msg.client.user).has("EMBED_LINKS")) {
				msg.channel.send(msg.author + ", my system requires `Embed Links` permissions for me to work properly, and it looks like I don't have those. Try talking to the server owner to make sure I have the permissions I need.");
			} else u.alertError(e, msg);
		});
  }
})
.addCommand({name: "botserver",
  description: "Get a link to the bot's support server.",
  category: "Bot Info",
  process: (msg) => msg.channel.send(`🏠 Here's an invite to my support server:\n<${Module.config.homeServer}>`)
})
.addCommand({name: "invite",
  description: "Get my invite link",
  category: "Bot Info",
  aliases: ["join"],
  process: (msg) => msg.channel.send(`Use this to bring me to your server:\n<${Module.config.inviteLink}>`)
})
.addCommand({name: "donate",
  description: "Help power Gerard's maintenance and development",
  category: "Bot Info",
  aliases: ["patreon", "support"],
  process: (msg) => msg.channel.send(`Power ${msg.client.user.username}'s maintenance and development and gain access to early features at <https://www.patreon.com/gaiwecoor>`)
});

module.exports = Module;
