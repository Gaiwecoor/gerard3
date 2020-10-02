const Augur = require("augurbot"),
  u = require("../utils/utils"),
  listDuration = 10;

function currentPlayers(msg, game) {
  // List people playing the game
  let embed = u
    .embed()
    .setTitle(`${msg.guild.name} members currently playing ${game}`)
    .setFooter(
      `React with 🔁 within ${listDuration} minutes to update this list.`
    );

  let players = msg.guild.members
    .filter(
      (u) =>
        !u.user.bot &&
        u.presence.game &&
        u.presence.game.name.toLowerCase().startsWith(game.toLowerCase())
    )
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .map((user) => `• ${u.escapeText(user.displayName)}`)
    .join("\n");

  if (players.length > 0) {
    if (players.length > 2048)
      players = players.substr(0, players.indexOf("\n", 2000)) + "\n...";
    embed.setDescription(players);
  } else embed.setDescription(`I couldn't find any members playing ${game}.`);

  return embed;
}

async function reloadList(msg, game) {
  try {
    if (msg.channel.permissionsFor(msg.client.user).has("ADD_REACTIONS"))
      await msg.react("🔁");

    let reactions = await msg.awaitReactions(
      (reaction, user) => reaction.emoji.name == "🔁" && !user.bot,
      { max: 1, time: listDuration * 60000 }
    );

    if (reactions.size > 0) {
      let embed = currentPlayers(msg, game);
      let m = null;

      if (msg.channel.permissionsFor(msg.client.user).has("MANAGE_MESSAGES")) {
        await msg.clearReactions();
        m = await msg.edit(embed);
      } else {
        msg.delete();
        m = await msg.channel.send(embed);
      }
      reloadList(m, game);
    } else msg.delete();
  } catch (e) {
    if (
      msg.channel.guild &&
      !msg.channel
        .permissionsFor(msg.client.user)
        .has(["EMBED_LINKS", "ADD_REACTIONS"])
    )
      msg.channel.send(
        msg.author +
          ", my system requires `Add Reactions` and `Embed Links` permissions for me to function properly and it looks like I don't have those. Try talking to the server owner to make sure I have the permissions I need."
      );
    else u.alertError(e);
  }
}

const Module = new Augur.Module().addCommand({
  name: "wip",
  category: "Community",
  description: "Find who is playing a game in the server",
  syntax: "[game name] (defaults to Brawlhalla)",
  aliases: ["whoison", "whoisplaying"],
  process: async (msg, suffix) => {
    try {
      u.clean(msg, listDuration * 60000);
      if (!suffix) suffix = "Brawlhalla";

      await msg.guild.fetchMembers();

      let embed = currentPlayers(msg, suffix);
      let m = await u.botSpam(msg).send(embed);
      reloadList(m, suffix);
    } catch (e) {
      u.alertError(e, msg);
    }
  },
  permissions: (msg) => msg.guild,
});

module.exports = Module;
