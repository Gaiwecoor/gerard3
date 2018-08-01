const Augur = require("../utils/Augur"),
  Module = new Augur.Module();

Module.addCommand({
  name: "say",
  aliases: ["blab"],
  syntax: "stuff",
  process: (msg, suffix) => {
    if (msg.deletable) msg.delete();
    msg.channel.send(suffix);
  },
  permissions: (msg) => Module.config.adminId.includes(msg.author.id)
});

module.exports = Module;
