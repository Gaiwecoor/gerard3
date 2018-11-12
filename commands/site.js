const Augur = require("augurbot"),
  Express = require("express"),
  bodyParser = require("body-parser"),
  config = require("../config/site.json"),
  fs = require("fs"),
  path = require("path"),
  session = require("express-session"),
  steam = require("steam-login");


const app = new Express(),
  http = require("http").Server(app);

const Module = new Augur.Module()
.setInit(() => {
  if (!Module.handler.client.shard || Module.handler.client.shard.id == 0) {
    app.set("views", "./site/views");
    app.set("view engine", "pug");
    app.disable("view cache");
    app.use(session({
      secret: config.sessionSecret,
      cookie: { maxAge: 3600000 },
      resave: false,
      saveUninitialized: false
    }));
    app.use((req, res, next) => {
      res.locals.handler = Module.handler;
      res.locals.bot = Module.handler.client;
      res.locals.loggedIn = (req.session.user || req.session.guilds);
      next();
    });

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));

    let routerPath = path.resolve(process.cwd(), "./site/private");
    let routers = fs.readdirSync(routerPath);
    routers = routers.filter(r => r.endsWith(".js")).map(f => f.slice(0, -3));

    routers.forEach(route => {
      let router = require(path.resolve(routerPath, route));
      if (route == "root") route = "";
      app.use(`/${route}`, router);
    });

    app.use(Express.static("./site/public"));

    // Assume 404'd
    app.use((req, res) => {
      res.render("pages/error", { status: 404, e: "Page not found." });
    });

    http.listen(config.port, (err) => {
      if (err) console.error(err);
      else console.log("Listening on port", config.port);
    });
  }
})
.setUnload(() => {
  if (!Module.handler.client.shard || Module.handler.client.shard.id == 0) {
    http.close();

    let routerPath = path.resolve(process.cwd(), "./site/private");
    let routers = fs.readdirSync(routerPath);
    routers = routers.filter(r => r.endsWith(".js"));

    routers.forEach(route => {
      delete require.cache[require.resolve(path.resolve(routerPath, route))];
    });
    delete require.cache[require.resolve(path.resolve(process.cwd(), "./site/auth.js"))];
  }
});

module.exports = Module;
