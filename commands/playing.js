const Augur = require("augurbot"),
  u = require("../utils/utils");

const Module = new Augur.Module()
.addCommand({name: "whoisplaying",
  category: "Community",
  description: "Find who is playing a game in the server",
  syntax: "[game name]",
  aliases: ["whoison", "wip"],
  process: (msg, suffix) => {
    if (!suffix) suffix = "Brawlhalla";
    let players = msg.guild.members.filter(m => (m.presence && m.presence.game && m.presence.game.name && m.presence.game.name.toLowerCase() == suffix.toLowerCase())).map(m => m.displayName);
    if (players.length > 0) {
      let playerNames = "• " + players.join("\n• ");
      if (playerNames.length > 1024) playerNames = playerNames.substr(0, playerNames.indexOf("\n", 1000)) + "\n...";

      let embed = u.embed()
        .setTitle(`${msg.guild.name} members currently playing ${suffix}`)
        .setDescription(playerNames)
        .setTimestamp
      u.botSpam(msg).send(embed);
    } else msg.channel.send(`I couldn't find any members playing ${suffix}.`);
  },
  permissions: (msg) => msg.guild
});

module.exports = Module;
