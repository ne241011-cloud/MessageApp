
const express = require("express");
const Sequelize = require("sequelize");

let DB_INFO = "postgres://messageapp:TheFirstTest@postgres:5432/messageapp";
let pg_option = {};

if (process.env.DATABASE_URL) {
  DB_INFO = process.env.DATABASE_URL;
  pg_option = { ssl: { rejectUnauthorized: false } };
}

const sequelize = new Sequelize(DB_INFO, {
  dialect: "postgres",
  dialectOptions: pg_option,
});

const PORT = 8080;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use("/public", express.static(__dirname + "/public"));

const Messages = sequelize.define(
  "messages",
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    message: Sequelize.TEXT,
  },
  {
    // timestamps: false,      // disable the default timestamps
    freezeTableName: true, // stick to the table name we define
  },
);

async function main() {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");

    await sequelize.sync({ force: false, alter: true });
    console.log("Database synchronized successfully.");

    setupRoute();
    app.listen(process.env.PORT || PORT);
  } catch (error) {
    console.error("Database error:", error);
  }
}

main();

let lastMessage = "";
function setupRoute() {
  app.get("/", (req, res) => {
    res.render("top.ejs");
  });

  app.get("/add", (req, res) => {
    res.render("add.ejs", { lastMessage: lastMessage });
  });

  app.post("/add", async (req, res) => {
    let newMessage = new Messages({
      message: req.body.text,
    });
    try {
      await newMessage.save();
      lastMessage = req.body.text;
      res.render("add.ejs", { lastMessage: lastMessage });
    } catch (error) {
      res.status(500).send("error");
    }
  });

  app.get("/view", async (req, res) => {
    try {
      let result = await Messages.findAll();
      console.log(result);
      let allMessages = result.map((e) => {
        return e.message + " " + e.createdAt;
      });
      res.render("view.ejs", { messages: allMessages });
    } catch (error) {
      res.status(500).send("error");
    }
  });
}
    