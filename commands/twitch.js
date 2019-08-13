const Augur = require("augurbot"),
  u = require("../utils/utils"),
  TwitchClient = require("twitch");

const twitch = {
  games: new Map(),
  online: false
};

async function checkStream(Module) {
  try {
    const bot = Module.handler.client;

    const stream = (await twitch.api.streams.getStreamByUserName("brawlhalla"))._data;

    if (stream && !twitch.online) {
      bot.user.setActivity(
        stream.title,
        {
          url: stream,
          type: "STREAMING"
        }
      );
      twitch.online = true;
    } else if (!stream && twitch.online) {
      let gameModes = [
        "Free-for-All", "Strikeout", "Experimental", "Brawl of the Week",
        "Ranked 1v1", "Ranked 2v2",
        "Brawlball", "Snowbrawl", "Dodgebomb", "Bombsketball", "Beachbrawl", "Switchcraft",
        "Training"
      ];
      let game = gameModes[Math.floor(Math.random() * gameModes.length)];
      bot.user.setActivity(game);

      twitch.online = false;
    }
  } catch(error) { u.alertError(error, "Twitch checkStream error"); }
}

const Module = new Augur.Module()
.addCommand({name: "devstream",
  category: "Community",
  description: "Link to the Brawlhalla Dev Stream and whether it's live.",
  process: async (msg) => {
    try {
      let embed = u.embed()
      .setTitle("Brawlhalla Devstream")
      .setColor("#6441A4")
      .setURL("https://www.twitch.tv/brawlhalla");

      const stream = (await twitch.api.streams.getStreamByUserName("brawlhalla"))._data;
      if (stream) {
        if (!twitch.games.has(stream.game_id)) {
          let game = (await twitch.api.games.getGameById(game.id))._data;
          twitch.games.set(game.id, game);
        }

        embed.setDescription(stream.title)
        .setThumbnail(stream.thumbnail_url.replace("{width}", "480").replace("{height}", "270"))
        .addField("Playing", twitch.games.get(stream.game_id))
        .addField("Current Viewers", stream.viewer_count)
        .setTimestamp(new Date(stream.started_at));

        msg.channel.send(embed).catch(e => {
          if (msg.guild && !msg.channel.permissionsFor(msg.client.user).has("EMBED_LINKS")) {
            msg.channel.send(msg.author + ", my new system requiresthe `Embed Links` permission for me to work properly, and it looks like I don't have that. Try talking to the server owner to make sure I have the permissions I need.");
          } else u.alertError(e, msg);
        });
      } else {
        embed.setDescription("**Currently Offline**\n" + twitch.devstream.description)
        .setThumbnail(twitch.devstream.profile_image_url);

        msg.channel.send(embed).catch(e => {
          if (msg.guild && !msg.channel.permissionsFor(msg.client.user).has("EMBED_LINKS")) {
            msg.channel.send(msg.author + ", my new system requires the `Embed Links` permission for me to work properly, and it looks like I don't have that. Try talking to the server owner to make sure I have the permissions I need.");
          } else u.alertError(e, msg);
        });
      }
    } catch(e) { u.alertError(e, msg); }
  }
})
.addCommand({name: "streaming",
  category: "Community",
  description: "Top 5 live Brawlhalla streams",
  info: "Finds five Brawlhalla streams on Twitch with the highest viewer count.",
  aliases: ["streams", "streamers", "stream"],
  process: async (msg) => {
    try {
      let streams = await twitch.api.getStreams({game: "460316", limit: 10});
      if (streams.data.length > 0) {
        let embed = u.embed()
        .setTitle("Live Brawlhalla Streams")
        .setThumbnail(twitch.games.get("460316").box_art_url.replace("{width}", "360").replace("{height}", "480"))
        .setColor("#6441A4")
        .setTimestamp()
        .setDescription("Top five live Brawlhalla streams:");

        streams.data.filter(s => s._data.game_id == "460316").sort((a, b)  => b._data.viewer_count - a._data.viewer_count);

        let users = await twitch.api.users.getUsersByIds(streams.data.map(s => s._data.user_id));

        for (let i = 0; i < Math.min(streams.data.length, 5), i++) {
          let stream = streams.data[i]._data;
          let user = users.find(u => u._data.id == stream.user_id)._data;
          embed.addField(user.display_name, `[${stream.title}](https://twitch.tv/${user.display_name}) (${stream.viewer_count} Viewers)`);
        }
        let channel = u.botSpam(msg);
        channel.send(embed).catch(e => {
          if (msg.guild && !channel.permissionsFor(msg.client.user).has("EMBED_LINKS")) {
            channel.send(msg.author + ", my new system requires the `Embed Links` permission for me to work properly, and it looks like I don't have that. Try talking to the server owner to make sure I have the permissions I need.");
          } else u.alertError(e, msg);
        });
      } else {
        msg.reply("I couldn't find any live streams!").then(u.clean);
      }
    } catch(e) { u.alertError(e, msg); }
  }
})
.setClockwork(() => {
  checkStream(Module);
  return setInterval(checkStream, 5 * 60 * 1000, Module);
})
.setInit((streamInfo) => {
  if (streamInfo) twitch.online = streamInfo;

  const {clientId, clientSecret} = Module.config.api.twitch;
  twitch.api = TwitchClient.withClientCredentials(clientId, twitch).helix;
  let game = (await twitch.api.games.getGameByName("Brawlhalla"))._data;
  twitch.games.set(game.id, game);
  twitch.devstream = (await twitch.api.users.getUserByName("Brawlhalla"))._data;
})
.setUnload(() => twitch.online);

module.exports = Module;
