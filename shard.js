const { ShardingManager } = require('discord.js');
var config = require("./config/config.json");

const Manager = new ShardingManager('./bot_base.js', {totalShards: "auto", token: config.token});

Manager.spawn();
Manager.on("launch", (shard) => {
	console.log("Launched Shard", shard.id);
});
