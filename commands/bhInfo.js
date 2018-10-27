const Augur = require("augurbot"),
  cheerio = require("cheerio"),
  parseXML = require("xml2js").parseString,
  request = require("request-promise-native"),
  u = require("../utils/utils");

async function announce(handler, item) {
  try {
    let embed = await feedEmbed(item);
    let servers = await handler.db.server.announceChannels();
    let channels = servers
    .filter(s => handler.client.channels.has(s.announce))
    .map(s => handler.client.channels.get(s.announce));

    channels.forEach(c => c.send(embed));
  } catch(e) { u.alertError(e); }
}

async function checkNews(handler) {
  try {
    let fs = require("fs");
    let file = process.cwd() + "/data/news.json";
    let oldNews = fs.readFileSync(file, "utf-8");
    oldNews = JSON.parse(oldNews);

    let item = await fetchFeed();
    let itemId = item.guid[0]._.substr(item.guid[0]._.indexOf("p=") + 2);
    if (!oldNews.includes(itemId)) {
      oldNews.push(itemId);
      await announce(handler, item);
      if (!handler.client.shard || handler.client.shard.id == 0)
      fs.writeFileSync(file, JSON.stringify(oldNews));
    }
  } catch(e) { u.alertError(e); }
}

async function feedEmbed(item) {
  let date = new Date(item.pubDate);
  let html = await request(item.link[0]);
  let $ = cheerio.load(html);

  let content = $('meta[property="og:description"]').attr("content");
  let img = $('meta[property="og:image"]');

  let embed = u.embed()
  .setTitle($('meta[property="og:title"]').attr("content"))
  .setDescription((content ? `${content} ` : "") + `[[Read More]](${item.link[0]})`)
  .setTimestamp(date)
  .setURL(item.link[0]);
  if (img) embed.setThumbnail($('meta[property="og:image"]').attr("content"));

  return embed;
}

function fetchFeed(type = null) {
  return new Promise(async (fulfill, reject) => {
    try {
      let body = await request(`http://www.brawlhalla.com/${(type ? `news/category/${type}/` : "")}feed/`);
      parseXML(body, async function(err, xml) {
        if (!err && xml && xml.rss && xml.rss.channel && xml.rss.channel[0].item) {
          try {
            let item = xml.rss.channel[0].item[0];
            fulfill(item);
          } catch(e) { reject(e); }
        } else reject(err);
      });
    } catch(e) { reject(e); }
  });
}

function updateLegends(key) {
  let bhApi = require("brawlhalla-api")(key);
  bhApi.updateLegends();
}

const Module = new Augur.Module()
.addCommand({name: "community",
  category: "Brawlhalla Info",
  description: "Get the latest Community Roundup.",
  aliases: ["art", "communityroundup", "communitycontent", "roundup"],
  process: async (msg) => {
    try {
      let item = await fetchFeed("community");
      let embed = await feedEmbed(item);
      msg.channel.send(embed);
    } catch(e) { u.alertError(e, msg); }
  }
})
.addCommand({name: "legend",
  category: "Brawlhalla Info",
  description: "Display a Legend Card",
  syntax: "Legend Name",
  aliases: ["lore", "legendinfo"],
  process: async (msg, suffix) => {
    try {
      let bh = require("brawlhalla-api")(Module.config.api.bh);
      if (suffix) {
        let legend = await bh.getLegendInfo(suffix);
        if (legend) {
          let slug = legend.legend_name_key.replace(" ", "_");

          let quotes = [
            legend.bio_quote_from,
            legend.bio_quote_from_attrib,
            legend.bio_quote,
            legend.bio_quote_about_attrib
          ].map(q => q.replace(/\"/g, "")).join("\n\n");

          let embed = u.embed()
            .setAuthor("Brawlhalla Lore")
            .setTitle(legend.bio_name)
            .setDescription(`*${legend.bio_aka}*\n\n${quotes}`)
            .setThumbnail(`${Module.config.imgPath}/legends/${slug}.png?API_KEY=${Module.config.api.resource}`)
            .addField("Weapons", legend.weapon_one + "\n" + legend.weapon_two, true)
            .addField("Stats", `**Str:** ${legend.strength}\n**Dex:** ${legend.dexterity}\n**Def:** ${legend.defense}\n**Spd:** ${legend.speed}`, true);

          let channel = u.botSpam(msg);

          channel.send(embed).catch(e => {
            if (msg.guild && !channel.permissionsFor(msg.client.user).has("EMBED_LINKS")) {
              channel.send(msg.author + ", my system requires `Embed Links` permissions for me to work properly, and it looks like I don't have those. Try talking to the server owner to make sure I have the permissions I need.");
            } else u.alertError(e, msg);
          });
        } else msg.reply("I couldn't find that legend.").then(u.clean);
      }
    } catch(e) { u.alertError(e, msg); }
  }
})
.addCommand({name: "patchnotes",
  category: "Brawlhalla Info",
  description: "Get the latest patch notes.",
  aliases: ["patch", "notes"],
  process: async (msg) => {
    let item = await fetchFeed("patch-notes");
    let embed = await feedEmbed(item);
    msg.channel.send(embed);
  }
})
.addCommand({name: "pingtest",
  category: "Brawlhalla Info",
  description: "Show console ping test commands for your region.",
  syntax: "[region]",
  aliases: ["ping"],
  process: (msg, suffix) => {
    let bh = require("brawlhalla-api")(Module.config.api.bh);

    let alias = {
      "us e": "us-e", "use": "us-e",
      "us w": "us-w", "usw": "us-w",
			"brs": "brz", "asia": "sea"
    };

    if (suffix && alias[suffix.toLowerCase()]) suffix = alias[suffix.toLowerCase()];

    let embed = u.embed()
      .setTitle("Ping Test Command for Brawlhalla Servers")
      .setDescription("Run within the Windows Console");

    if (suffix && bh.regions[suffix.toLowerCase()]) {
      embed.addField(suffix.toUpperCase(), `ping -n 30 pingtest-${bh.regions[suffix.toLowerCase()]}.brawlhalla.com`);
    } else {
      for (region in bh.regions) {
        embed.addField(region.toUpperCase(), `ping -n 30 pingtest-${bh.regions[region]}.brawlhalla.com`);
      }
    }

    let channel = u.botSpam(msg);

    channel.send(embed).catch(e => {
			if (msg.guild && !channel.permissionsFor(msg.client.user).has("EMBED_LINKS")) {
				channel.send(msg.author + ", my system requires `Embed Links` permissions for me to work properly, and it looks like I don't have those. Try talking to the server owner to make sure I have the permissions I need.");
			} else u.alertError(e, msg);
		});
  }
})
.addCommand({name: "servers",
  category: "Brawlhalla Info",
  description: "Common Brawlhalla Discord Servers",
  info: "Sends invites for Brawlhalla Discord hubs.",
  process: (msg) => {
    let embed = u.embed()
      .setTitle("Brawlhalla Discord Servers")
      .setDescription("Here are a few official and large community Brawlhalla Discord Servers:")
      .addField("Brawlhalla Esports", "Official Brawlhalla esports server. [[invite]](https://discord.gg/myVskrR)")
			.addField("The Forge", "Official balance discussion server. [[invite]](https://discord.gg/EtBJsBN)")
			.addField("Brawl League", "Brawlhalla Circuit and Community Tournaments. [[invite]](https://discord.gg/brawlleague)")
			.addField("Brawl League Academy", "Mentoring for Gold and Under (NA/EU). [[invite]](https://discord.gg/EwBX69r)")
			.addField("/r/Brawlhalla", "The official Discord server of the /r/brawlhalla subreddit. [[invite]](https://discord.gg/brawlhalla)")
			.addField("Clanhalla", "All things Clan Battles. [[invite]](https://discord.gg/clanhalla)")
			.addField("Globrawlhalla", "Regional Clan Battles and groups. [[invite]](https://discord.gg/UwEamjf)")
			.addField("Aus Sea Brawlhalla", "AUS/SEA hub for Brawlhalla tournaments and activities. [[invite]](https://discord.gg/wNj4dqc)")
			.addField("Yggdrasil", "BRZ hub for Brawlhalla activities. [[invite]](https://discordapp.gg/VxVujFe)");

    let channel = u.botSpam(msg);
		channel.send(embed).catch(e => {
			if (msg.guild && !channel.permissionsFor(msg.client.user).has("EMBED_LINKS")) {
				channel.send(msg.author + ", my system requires `Embed Links` permissions for me to work properly, and it looks like I don't have those. Try talking to the server owner to make sure I have the permissions I need.");
			} else u.alertError(e, msg);
		});
  }
})
.addCommand({name: "updatelegends",
  category: "Bot Admin", hidden: true,
  description: "Reload legend information from the API.",
  process: (msg) => {
    if (!msg.client.shard) updateLegends(Module.config.api.bh);
    else msg.client.shard.broadcastEval(`(${updateLegends})("${Module.config.api.bh}")`);
  },
  permissions: (msg) => Module.config.adminId.includes(msg.author.id)
})
.setClockwork(() => {
  checkNews(Module.handler);
  return setInterval(checkNews, 3600000, Module.handler);
});

module.exports = Module;
