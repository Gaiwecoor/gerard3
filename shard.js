const { ShardingManager } = require('discord.js');
const config = require("./config/config.json");

const Manager = new ShardingManager('./base.js', {token: config.token});

Manager.spawn();
Manager.on("launch", (shard) => {
	console.log("Launched Shard", shard.id);
});

module.exports = Manager;
