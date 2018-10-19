const Augur = require("augurbot"),
  u = require("../utils/utils"),
  TwitchApi = require("twitch-api");

var streamStatus = {
  status: "offline",
  since: Date.now()
};

function checkStream(Module) {
  let bot = Module.handler.client;
  let twitch = new TwitchApi(Module.config.api.twitch);

  twitch.getChannelStream("brawlhalla", (error, body) => {
    if (error) u.alertError(error);
    else if (body.stream && (streamStatus.status == "offline")) {
      bot.user.setActivity(
        body.stream.channel.status,
        {
          url: body.stream.channel.url,
          type: "STREAMING"
        }
      );

      streamStatus = {
        status: "online",
        since: Date.now()
      };
    } else if (!body.stream && (streamStatus.status == "online")) {
      let gameModes = [
  	    "Free-for-All", "Strikeout", "Experimental", "Brawl of the Week",
  	    "Ranked 1v1", "Ranked 2v2",
        "Brawlball", "Snowbrawl", "Dodgebomb", "Bombsketball", "Beachbrawl", "Switchcraft",
  	    "Training"
  		];
  		let game = gameModes[Math.floor(Math.random() * gameModes.length)];
  		bot.user.setActivity(game);

      streamStatus = {
        status: "offline",
        since: Date.now()
      };
    }
  });
}

const Module = new Augur.Module()
.addCommand({name: "devstream",
  category: "Community",
  description: "Link to the Brawlhalla Dev Stream and whether it's live.",
  process: (msg) => {
    let twitch = new TwitchApi(Module.config.api.twitch);

    let embed = u.embed()
      .setTitle("Brawlhalla Devstream")
      .setColor("#6441A4")
      .setURL("https://www.twitch.tv/brawlhalla");

    twitch.getChannelStream("brawlhalla", (error, body) => {
      if (error) u.alertError(error, msg);
      else if (body.stream) {
        embed.setDescription(body.stream.channel.status)
          .setThumbnail(body.stream.preview.small)
          .addField("Playing", body.stream.game, true)
          .addField("Current Viewers", body.stream.viewers, true);
        msg.channel.send(embed).catch(e => {
					if (msg.guild && !msg.channel.permissionsFor(bot.user).has("EMBED_LINKS")) {
						msg.channel.send(msg.author + ", my new system requiresthe `Embed Links` permission for me to work properly, and it looks like I don't have that. Try talking to the server owner to make sure I have the permissions I need.");
					} else u.alertError(e, msg);
				});
      } else {
        twitch.getChannel("brawlhalla", (error, body) => {
          if (error) u.alertError(error, msg);
          else {
            embed.setDescription("Currently Offline")
              .setThumbnail(body.logo)
              .addField("Followers", body.followers);
            msg.channel.send(embed).catch(e => {
    					if (msg.guild && !msg.channel.permissionsFor(bot.user).has("EMBED_LINKS")) {
    						msg.channel.send(msg.author + ", my new system requires the `Embed Links` permission for me to work properly, and it looks like I don't have that. Try talking to the server owner to make sure I have the permissions I need.");
    					} else u.alertError(e, msg);
    				});
          }
        });
      }
    });
  }
})
.addCommand({name: "streaming",
  category: "Community",
  description: "Top 5 live Brawlhalla streams",
  info: "Finds five Brawlhalla streams on Twitch with the highest viewer count.",
  aliases: ["streams", "streamers", "stream"],
  process: (msg) => {
    let twitch = new TwitchApi(Module.config.api.twitch);
    twitch.getStreams({game: "Brawlhalla", limit: 10}, (error, body) => {
      if (error) u.alertError(error, msg);
      else {
        let embed = u.embed()
          .setTitle("Live Brawlhalla Streams")
          .setThumbnail(Module.config.imgPath + "/weapons/horn.png?API_KEY=" + Module.config.api.claim)
          .setColor("#6441A4")
          .setTimestamp()
          .setDescription("Top five live Brawlhalla streams:");

        body.streams.filter((s) => s.game.toLowerCase() == "brawlhalla").sort((a, b) => b.viewers - a.viewers).filter((s, i) => i < 5).forEach(stream => {
          embed.addField(stream.channel.display_name, `[${stream.channel.status}](${stream.channel.url}) (${stream.viewers} Viewers)`);
        });
        if (embed.fields.length > 0) {
          let channel = u.botSpam(msg);
          channel.send(embed).catch(e => {
            if (msg.guild && !channel.permissionsFor(bot.user).has("EMBED_LINKS")) {
              channel.send(msg.author + ", my new system requires the `Embed Links` permission for me to work properly, and it looks like I don't have that. Try talking to the server owner to make sure I have the permissions I need.");
            } else u.alertError(e, msg);
          });
        } else msg.reply("I couldn't find any live streams.").then(u.clean);
      }
    });
  }
})
.setClockwork(() => {
  checkStream(Module);
  return setInterval(checkStream, 5 * 60 * 1000, Module);
})
.setInit((streamInfo) => {
  if (streamInfo) streamStatus = streamInfo;
})
.setUnload(() => streamStatus);

module.exports = Module;
