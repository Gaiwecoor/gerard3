## Augur - Discord bot framework



---

## Command File Structure

Save your `command.js` file in the `./commands` directory.

The file begins with:
```
const Augur = require("../utils/Augur");
const Module = new Augur.Module();
```
And finish the file with:
```
module.exports = Module;
```

In between, you can add cone or more commands and event handlers, as well as a clockwork and unload function.

### Commands
```
Module.addCommand({
  name: "commandname", // required
  aliases: [], // optional
  syntax: "", // optional
  description: "", // recommended
  info: "", // recommended
  hidden: false, // optional
  category: "General", // optional
  permissions: (msg) => true, // optional
  process: (msg, suffix) => {} // required
});
```

### Events
```
Module.addEvent("eventName", (...args) => {});
```

### Clockwork
```
Module.addClockwork((bot) => { return setInterval(); });
```

### Unload
```
Module.setUnload((bot) => {});
```
