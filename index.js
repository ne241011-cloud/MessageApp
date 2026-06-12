const express = require("express");
const Sequelize = require("sequelize");
const { Op } = require("sequelize");

let DB_INFO;
let pg_option = {};

// デバッグ用：Renderのログに実際に何が届いているか出力させる
console.log("--- DEBUG DATABASE_URL ---");
console.log("Type:", typeof process.env.DATABASE_URL);
console.log("Value:", process.env.DATABASE_URL);

// 文字列として正しく、かつ 'postgres' から始まっている場合のみRenderの設定を使う
if (
  typeof process.env.DATABASE_URL === 'string' && 
  process.env.DATABASE_URL.startsWith('postgres')
) {
  // 🟢 正真正銘のRender環境
  DB_INFO = process.env.DATABASE_URL;
  pg_option = { 
    ssl: { 
      require: true, 
      rejectUnauthorized: false 
    } 
  };
} else {
  // 🔵 ローカルDocker環境（Render側でURLが狂っている場合も一旦こちらに逃がす）
  DB_INFO = "postgres://messageapp:TheFirstTest@postgres:5432/messageapp";
  pg_option = {};
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
    freezeTableName: true,
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

  // トップページ
  app.get("/", (req, res) => {
    res.render("top.ejs");
  });

  // 登録ページ表示
  app.get("/add", (req, res) => {
    res.render("add.ejs", { lastMessage: lastMessage });
  });

  // 登録処理
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

  // 一覧表示
  app.get("/view", async (req, res) => {
    try {
      let result = await Messages.findAll();

      let allMessages = result.map((e) => {
        return e.message + " " + e.createdAt;
      });

      res.render("view.ejs", {
        messages: allMessages,
      });

    } catch (error) {
      res.status(500).send("error");
    }
  });

  // =====================
  // 検索画面表示
  // =====================

  app.get("/search", (req, res) => {
    res.render("search.ejs", {
      messages: [],
    });
  });

  // =====================
  // 検索実行
  // =====================

  app.post("/search", async (req, res) => {
    try {

      let result = await Messages.findAll({
        where: {
          message: {
            [Op.regexp]: req.body.searchText,
          },
        },
      });

      let allMessages = result.map((e) => {
        return e.message + " " + e.createdAt;
      });

      res.render("search.ejs", {
        messages: allMessages,
      });

    } catch (error) {
      console.log(error);
      res.status(500).send("error");
    }
  });

}