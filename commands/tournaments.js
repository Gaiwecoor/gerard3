const Augur = require("augurbot"),
  u = require("../utils/utils"),
  smash = require("../utils/smash");

Module = new Augur.Module()
.addCommand({name: "official",
  category: "Tournaments",
  description: "Find upcoming official Brawlhalla tournaments on [Smash.gg](https://smash.gg/brawlhalla).",
  process: async (msg) => {
    try {
      let embed = u.embed()
        .setTitle("Upcoming Official Brawlhalla Tournaments")
        .setDescription("Official Brawlhalla Tournaments on [Smash.gg](https://smash.gg/brawlhalla)")
        .setThumbnail(Module.config.imgPath + "/weapons/spawn.png?API_KEY=" + Module.config.api.claim);

      let circuit = await smash.tournament("brawlhalla", ["visibleEntityContainerTag"]);
      let slugTest = /tournament\/(\w+(-\w+)*)\/event/;
      let slugs = circuit.entities.event
        .sort((a, b) => a.startAt - b.startAt)
        .filter((e) => ((e.startAt * 1000) > Date.now()))
        .filter((e, i) => i < 6)
        .map(e => slugTest.exec(e.slug)[1]);

      let tournaments = slugs.map(slug => smash.tournament(slug, []));

      let tourneys = await Promise.all(tournaments);

      tourneys.map(t => t.entities.tournament).forEach(t => {
        let d = new Date(t.startAt * 1000);
        embed.addField(d.toDateString(), `[${t.name}](https://smash.gg/${t.slug})`);
      });

      let channel = u.botSpam(msg);
      channel.send(embed).catch(e => {
				if (msg.guild && !channel.permissionsFor(bot.user).has("EMBED_LINKS")) {
					channel.send(msg.author + ", my new system requires the `Embed Links` permission for me to work properly, and it looks like I don't have those. Try talking to the server owner to make sure I have the permissions I need.");
				} else u.alertError(e, msg);
			});
    } catch(e) { u.alertError(e, msg); }
  }
})
.addCommand({name: "tournaments",
  category: "Tournaments",
  description: "Find upcoming Brawlhalla tournaments on Smash.gg",
  aliases: ["tourneys", "tournament", "tourney", "bracket", "brackets"],
  process: async (msg) => {
    try {
      let embed = u.embed()
        .setTitle("Upcoming Brawlhalla Tournaments")
        .setDescription("See all official Brawlhalla tournaments on [Smash.gg](https://smash.gg/brawlhalla)")
        .setThumbnail(Module.config.imgPath + "/weapons/span.png?API_KEY=" + Module.config.api.claim)
        .setTimestamp();

      let date = Math.floor((Date.now() + (4 * 7 * 24 * 60 * 60 * 1000)) / 1000);

      let results = await smash.search({
        upcoming: true,
        past: false,
        beforeDate: date,
        videogameIds: 15
      });

      let tournaments = results.items.entities.tournament;
      let events = results.items.entities.event;
      events.filter(e => e.videogameId == 15)
        .filter(e => e.startAt > Date.now() / 1000)
        .map(e => e.tournamentId)
        .filter((tid, i, e) => e.indexOf(tid) == i && tournaments.find(t => t.id == tid).attendeeCount > 10)
        .map(tid => tournaments.find(t => t.id == tid))
        .sort((a, b) => a.startAt - b.startAt)
        .filter((e, i) => i < 25)
        .forEach(t => {
          let d = new Date(t.startAt * 1000);
          embed.addField(d.toDateString(), `[${t.name}](https://smash.gg/${t.slug})`);
        });

        let channel = u.botSpam(msg);
        channel.send(embed).catch(e => {
  				if (msg.guild && !channel.permissionsFor(bot.user).has("EMBED_LINKS")) {
  					channel.send(msg.author + ", my new system requires the `Embed Links` permission for me to work properly, and it looks like I don't have those. Try talking to the server owner to make sure I have the permissions I need.");
  				} else u.alertError(e, msg);
  			});
    } catch(e) { u.alertError(e, msg); }
  }
});

module.exports = Module;
