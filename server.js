import express from "express";
import bodyParser from "body-parser";
import { create } from "express-handlebars";
import * as helpers from "./lib/helpers.js";
import sequelize from "./db/dbconfig.js";
import User from "./db/model/User.js";
import * as path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
// Create `ExpressHandlebars` instance with a default layout.
const hbs = create({
  helpers,

  // Uses multiple partials dirs, templates in "shared/templates/" are shared
  // with the client-side of the app (see below).
  partialsDir: ["shared/templates/", "views/partials/"],
});

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine("handlebars", hbs.engine);
app.set("view engine", "handlebars");
app.set("views", path.resolve(__dirname, "./views"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware to expose the app's shared templates to the client-side of the app
// for pages which need them.
function exposeTemplates(req, res, next) {
  // Uses the `ExpressHandlebars` instance to get the get the **precompiled**
  // templates which will be shared with the client-side of the app.
  hbs
    .getTemplates("shared/templates/", {
      cache: app.enabled("view cache"),
      precompiled: true,
    })
    .then((templates) => {
      // RegExp to remove the ".handlebars" extension from the template names.
      const extRegex = new RegExp(hbs.extname + "$");

      // Creates an array of templates which are exposed via
      // `res.locals.templates`.
      templates = Object.keys(templates).map((name) => {
        return {
          name: name.replace(extRegex, ""),
          template: templates[name],
        };
      });

      // Exposes the templates during view rendering.
      if (templates.length) {
        res.locals.templates = templates;
      }

      setImmediate(next);
    })
    .catch(next);
}

app.get("/", (req, res) => {
  res.render("home", {
    title: "Home",
  });
});

sequelize
  .authenticate()
  .then(() => {
    console.log("Connexion à la base de données établie avec succès");
  })
  .catch((erreur) => {
    console.error("Erreur lors de la connexion à la base de données :", erreur);
  });

app.get("/yell", (req, res) => {
  res.render("yell", {
    title: "Yell",

    // This `message` will be transformed by our `yell()` helper.
    message: "hello world",
  });
});

app.get("/exclaim", (req, res) => {
  res.render("yell", {
    title: "Exclaim",
    message: "hello world",

    // This overrides _only_ the default `yell()` helper.
    helpers: {
      yell(msg) {
        return msg + "!!!";
      },
    },
  });
});

app.get("/echo/:message?", exposeTemplates, (req, res) => {
  res.render("echo", {
    title: "Echo",
    message: req.params.message,

    // Overrides which layout to use, instead of the defaul "main" layout.
    layout: "shared-templates",

    partials: Promise.resolve({
      echo: hbs.handlebars.compile("<p>ECHO: {{message}}</p>"),
    }),
  });
});

app.get("/user", (req, res) => {
  User.findAll()
    .then((data) => {
      const users = data.map((user) => user.dataValues);
      res.render("user", { users });
    })
    .catch((err) => console.log(err));
});

app.post("/utilisateurs", (req, res) => {
  const { nom, prenom } = req.body;
  User.create({ nom: nom, prenom: prenom }).catch((err) => console.log(err));
  res.redirect("/user");
});

app.get("/user/:id", (req, res) => {
  User.destroy({ where: { id: req.params.id } }).catch((err) => console.log(err)
 );
  res.redirect("/user");
});

app.use(express.static("public/"));

app.listen(3000, () => {
  console.log("express-handlebars example server listening on: 3000");
});
