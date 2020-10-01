const Augur = require("augurbot"),
  u = require("../utils/utils");

const pages = 5,
  queueTime = 20;

function checkBoard(msg, region, board = "1v1") {
  let bh = require("brawlhalla-api")(Module.config.api.bh);
  let alias = {
    "us e": "us-e",
    use: "us-e",
    "us w": "us-w",
    usw: "us-w",
    brs: "brz",
    asia: "sea",
  };

  if (region && alias[region.toLowerCase()])
    region = alias[region.toLowerCase()];

  if (region && bh.regions[region.toLowerCase()]) {
    let embed = u
      .embed()
      .setTitle("Ranked Queue")
      .setDescription(
        `The following Top ${
          pages * 50
        } ${region.toUpperCase()} players have played in the ${board} queue within the last ${queueTime} minutes.`
      )
      .setThumbnail(
        Module.config.imgPath +
          "/weapons/spawn.png?API_KEY=" +
          Module.config.api.resource
      );

    Module.db.leaderboards
      .fetchQueue(region, board, queueTime)
      .then((records) => {
        records
          .sort((a, b) => a.rank - b.rank)
          .forEach((record) => {
            embed.addField(
              u.decode(record.name),
              `Rank: ${record.rank}\nRating: ${record.rating}\nCurrently ${
                record.rating - record.previous > 0 ? "climbing" : "falling"
              }.`,
              true
            );
          });
        if (embed.fields.length == 0)
          embed.setDescription(
            `No Top ${
              pages * 50
            } ${region.toUpperCase()} players have played in the ${board} queue within the last ${queueTime} minutes.`
          );

        let channel = u.botSpam(msg);
        channel.send({ embed }).catch((e) => {
          if (
            msg.guild &&
            !channel.permissionsFor(msg.client.user).has("EMBED_LINKS")
          ) {
            channel.send(
              msg.author +
                ", my new system requires the `Embed Links` permission for me to work properly, and it looks like I don't have those. Try talking to the server owner to make sure I have the permissions I need."
            );
          } else u.alertError(e, msg);
        });
      })
      .catch((e) => u.alertError(e, msg));
  } else {
    msg
      .reply(
        `you need to tell me which region to check. (${Object.keys(bh.regions)
          .map((r) => r.toUpperCase())
          .join(", ")})`
      )
      .then(u.clean);
  }
}

const Module = new Augur.Module()
  .addCommand({
    name: "queue",
    category: "Community",
    description: `Show which regional top ${
      pages * 5
    } players have been queuing ranked within the last ${queueTime} minutes.`,
    syntax: "<region>",
    aliases: ["queueing", "q", "que"],
    process: (msg, suffix) => checkBoard(msg, suffix, "1v1"),
  })
  .addCommand({
    name: "queue2v2",
    category: "Community",
    description: `Show which regional top ${
      pages & 5
    } players have been queueing 2v2 ranked within the last ${queueTime} minutes.`,
    syntax: "<region>",
    aliases: ["queue2", "q2", "q2v2", "que2", "que2v2"],
    process: (msg, suffix) => checkBoard(msg, suffix, "2v2"),
  })
  .setClockwork(() => {
    let shard = Module.handler.client.shard;
    if (!shard || shard.id === 0) {
      let bh = require("brawlhalla-api")(Module.config.api.bh);
      let i = 0,
        refresh = 6 * 60000,
        regions = Object.keys(bh.regions),
        iterations = pages * regions.length;

      return setInterval(() => {
        Module.db.leaderboards.fetchRankings(
          regions[i % regions.length],
          (i % pages) + 1
        );
        i++;
        i %= iterations;
      }, refresh / iterations);
    }
  });

module.exports = Module;
