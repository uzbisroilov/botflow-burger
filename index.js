require("dotenv").config();

const express = require("express");
const cors = require("cors");
const TelegramBot = require("node-telegram-bot-api");

const { registerBot } = require("./bot/bot");
const { adminRoutes } = require("./web/adminRoutes");
const { ensureDataFile } = require("./services/orderService");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN topilmadi");
  process.exit(1);
}

const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: true,
});

ensureDataFile();

registerBot(bot);
adminRoutes(app, bot);

app.get("/", (req, res) => {
  res.send(`
    <h1>🚀 BotFlow AI SaaS ishlayapti</h1>
    <p><a href="/admin">Admin panel</a></p>
    <p><a href="/admin/burger">Burger owner panel</a></p>
    <p><a href="/admin/sushi">Sushi owner panel</a></p>
    <p><a href="/admin/coffee">Coffee owner panel</a></p>
  `);
});

app.listen(PORT, () => {
  console.log(`🌐 Server port ${PORT} da ishlayapti`);
});

console.log("🚀 BotFlow Modular SaaS ishlayapti...");