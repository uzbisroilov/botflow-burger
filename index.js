require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs-extra");
const express = require("express");
const cors = require("cors");

let openai = null;
if (process.env.OPENAI_API_KEY) {
  try {
    const OpenAI = require("openai");
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log("🤖 OpenAI ulandi");
  } catch (error) {
    console.log("⚠️ OpenAI ulanmagan:", error.message);
  }
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const ORDERS_FILE = "./data/orders.json";

const restaurants = {
  burger: {
    id: "burger",
    name: "🍔 BotFlow Burger",
    phone: "+998 90 777 70 70",
    address: "Toshkent shahar, Chilonzor",
    maps: "https://maps.google.com",
    menu: {
      classic_burger: { name: "🍔 Classic Burger", price: 32000 },
      cheese_burger: { name: "🧀 Cheese Burger", price: 38000 },
      lavash: { name: "🌯 Tovuqli Lavash", price: 30000 },
      hot_dog: { name: "🌭 Hot Dog", price: 22000 },
      fries: { name: "🍟 Fri", price: 15000 },
      cola: { name: "🥤 Cola", price: 10000 },
    },
  },
  sushi: {
    id: "sushi",
    name: "🍣 Sushi Master",
    phone: "+998 90 555 55 55",
    address: "Toshkent shahar, Yunusobod",
    maps: "https://maps.google.com",
    menu: {
      california: { name: "🍣 California Roll", price: 48000 },
      philadelphia: { name: "🍱 Philadelphia Roll", price: 55000 },
      set_small: { name: "🍙 Mini Sushi Set", price: 89000 },
      set_big: { name: "🍣 Big Sushi Set", price: 159000 },
      soy: { name: "🥢 Soy Sauce", price: 5000 },
      cola: { name: "🥤 Cola", price: 10000 },
    },
  },
  coffee: {
    id: "coffee",
    name: "☕ Coffee Time",
    phone: "+998 90 111 11 11",
    address: "Toshkent shahar, Mirzo Ulug‘bek",
    maps: "https://maps.google.com",
    menu: {
      americano: { name: "☕ Americano", price: 18000 },
      cappuccino: { name: "🥛 Cappuccino", price: 24000 },
      latte: { name: "☕ Latte", price: 26000 },
      cheesecake: { name: "🍰 Cheesecake", price: 32000 },
      croissant: { name: "🥐 Croissant", price: 22000 },
      water: { name: "💧 Water", price: 6000 },
    },
  },
};

const sessions = {};

async function ensureDataFile() {
  await fs.ensureDir("./data");
  if (!(await fs.pathExists(ORDERS_FILE))) {
    await fs.writeJson(ORDERS_FILE, [], { spaces: 2 });
  }
}

async function getOrders() {
  await ensureDataFile();
  return await fs.readJson(ORDERS_FILE);
}

async function saveOrders(orders) {
  await fs.writeJson(ORDERS_FILE, orders, { spaces: 2 });
}

async function saveOrder(order) {
  const orders = await getOrders();
  orders.push(order);
  await saveOrders(orders);
}

async function updateOrderStatus(orderId, status) {
  const orders = await getOrders();
  const order = orders.find((o) => o.orderId === orderId);

  if (!order) return null;

  order.status = status;
  order.updatedAt = new Date().toISOString();

  await saveOrders(orders);
  return order;
}

function getSession(chatId) {
  if (!sessions[chatId]) {
    sessions[chatId] = {
      restaurantId: null,
      items: [],
      step: "choose_restaurant",
      phone: "",
      address: "",
    };
  }
  return sessions[chatId];
}

function resetSession(chatId) {
  sessions[chatId] = {
    restaurantId: null,
    items: [],
    step: "choose_restaurant",
    phone: "",
    address: "",
  };
}

function money(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " so‘m";
}

function getRestaurant(session) {
  if (!session.restaurantId) return null;
  return restaurants[session.restaurantId] || null;
}

function total(session) {
  return session.items.reduce((sum, item) => sum + item.price, 0);
}

function summary(session) {
  if (session.items.length === 0) return "🛒 Savat bo‘sh.";

  let text = "🧾 Buyurtma:\n\n";
  session.items.forEach((item, i) => {
    text += `${i + 1}. ${item.name} — ${money(item.price)}\n`;
  });
  text += `\n💰 Jami: ${money(total(session))}`;
  return text;
}

function restaurantKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: restaurants.burger.name, callback_data: "restaurant_burger" }],
        [{ text: restaurants.sushi.name, callback_data: "restaurant_sushi" }],
        [{ text: restaurants.coffee.name, callback_data: "restaurant_coffee" }],
      ],
    },
  };
}

function mainKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        ["🏪 Restoran tanlash", "📋 Menu"],
        ["🧾 Savat", "🪑 Bron"],
        ["📍 Location", "☎️ Admin"],
        ["📊 Statistika", "❌ Bekor qilish"],
      ],
      resize_keyboard: true,
    },
  };
}

function menuText(restaurant) {
  let text = `🍽 ${restaurant.name} MENU:\n\n`;
  Object.values(restaurant.menu).forEach((item) => {
    text += `${item.name} — ${money(item.price)}\n`;
  });
  text += "\n👇 Tanlang:";
  return text;
}

function menuKeyboard(restaurant) {
  const items = Object.entries(restaurant.menu);
  const buttons = [];

  for (let i = 0; i < items.length; i += 2) {
    const row = [];
    const [key1, item1] = items[i];
    row.push({ text: item1.name, callback_data: `food_${key1}` });

    if (items[i + 1]) {
      const [key2, item2] = items[i + 1];
      row.push({ text: item2.name, callback_data: `food_${key2}` });
    }

    buttons.push(row);
  }

  buttons.push([{ text: "🧾 Savat", callback_data: "cart" }]);
  return { reply_markup: { inline_keyboard: buttons } };
}

function cartKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "➕ Yana qo‘shish", callback_data: "more" },
          { text: "✅ Yakunlash", callback_data: "finish" },
        ],
        [{ text: "🧹 Savatni tozalash", callback_data: "clear_cart" }],
      ],
    },
  };
}

async function sendStatistics(chatId) {
  const orders = await getOrders();

  if (orders.length === 0) return bot.sendMessage(chatId, "📊 Hali orderlar yo‘q.");

  const revenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const clients = new Set(orders.map((o) => o.phone));

  return bot.sendMessage(
    chatId,
    `📊 BotFlow statistikasi:

🛒 Jami orderlar: ${orders.length}
👥 Klientlar: ${clients.size}
💰 Jami savdo: ${money(revenue)}`
  );
}

async function aiWaiterReply(text, restaurant) {
  if (!openai) return "🤖 AI hali ulanmagan. Buyurtma uchun 📋 Menu ni bosing.";

  const menuInfo = restaurant
    ? Object.values(restaurant.menu).map((i) => `${i.name} - ${money(i.price)}`).join("\n")
    : Object.values(restaurants).map((r) => r.name).join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: `
Sen BotFlow AI restoran operatorisan.
O‘zbek tilida qisqa, muloyim va sotuvchi uslubda javob ber.
Mijozga taom tavsiya qil. Buyurtma qilish uchun Menu tugmasini bosishini ayt.

Menyu:
${menuInfo}
`,
      },
      { role: "user", content: text },
    ],
  });

  return completion.choices[0].message.content;
}

function askRestaurant(chatId) {
  return bot.sendMessage(
    chatId,
    "🏪 Qaysi restorandan buyurtma qilmoqchisiz?",
    restaurantKeyboard()
  );
}

/* ===================== WEB ADMIN PANEL ===================== */

app.get("/", (req, res) => {
  res.send("BotFlow AI is running 🚀 Open /admin");
});

app.get("/admin", async (req, res) => {
  const orders = await getOrders();
  const revenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const clients = new Set(orders.map((o) => o.phone));

  const rows = orders
    .slice()
    .reverse()
    .map((o) => {
      const date = o.createdAt ? new Date(o.createdAt).toLocaleString("ru-RU") : "-";

      return `
      <tr>
        <td>${o.orderId}</td>
        <td>${o.restaurant}</td>
        <td>${o.customer}</td>
        <td>${o.phone}</td>
        <td>${o.address}</td>
        <td>${money(o.total || 0)}</td>
        <td><b>${o.status || "Yangi"}</b></td>
        <td>${date}</td>
        <td>
          <form method="POST" action="/admin/status" style="display:inline">
            <input type="hidden" name="orderId" value="${o.orderId}" />
            <input type="hidden" name="status" value="✅ Qabul qilindi" />
            <button class="btn green">Qabul</button>
          </form>

          <form method="POST" action="/admin/status" style="display:inline">
            <input type="hidden" name="orderId" value="${o.orderId}" />
            <input type="hidden" name="status" value="👨‍🍳 Tayyorlanmoqda" />
            <button class="btn orange">Tayyorlanmoqda</button>
          </form>

          <form method="POST" action="/admin/status" style="display:inline">
            <input type="hidden" name="orderId" value="${o.orderId}" />
            <input type="hidden" name="status" value="🚗 Yo‘lda" />
            <button class="btn blue">Yo‘lda</button>
          </form>

          <form method="POST" action="/admin/status" style="display:inline">
            <input type="hidden" name="orderId" value="${o.orderId}" />
            <input type="hidden" name="status" value="🎉 Yetkazildi" />
            <button class="btn purple">Yetkazildi</button>
          </form>

          <form method="POST" action="/admin/status" style="display:inline">
            <input type="hidden" name="orderId" value="${o.orderId}" />
            <input type="hidden" name="status" value="❌ Bekor qilindi" />
            <button class="btn red">Bekor</button>
          </form>
        </td>
      </tr>`;
    })
    .join("");

  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>BotFlow Admin</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background:#f4f6f8;
      padding:24px;
      color:#111827;
    }

    h1 {
      margin-bottom:8px;
      font-size:34px;
    }

    .cards {
      display:flex;
      gap:16px;
      margin:20px 0;
      flex-wrap:wrap;
    }

    .card {
      background:white;
      padding:18px;
      border-radius:16px;
      box-shadow:0 3px 12px #0001;
      min-width:180px;
      font-size:20px;
    }

    table {
      width:100%;
      border-collapse:collapse;
      background:white;
      border-radius:16px;
      overflow:hidden;
      box-shadow:0 3px 12px #0001;
    }

    th, td {
      padding:12px;
      border-bottom:1px solid #eee;
      text-align:left;
      font-size:14px;
      vertical-align:top;
    }

    th {
      background:#111827;
      color:white;
    }

    .btn {
      border:none;
      color:white;
      padding:7px 10px;
      border-radius:8px;
      cursor:pointer;
      margin:2px;
      font-size:12px;
    }

    .green { background:#16a34a; }
    .orange { background:#f97316; }
    .blue { background:#2563eb; }
    .purple { background:#7c3aed; }
    .red { background:#dc2626; }

    .refresh {
      display:inline-block;
      margin:10px 0 20px;
      background:#111827;
      color:white;
      padding:10px 14px;
      border-radius:10px;
      text-decoration:none;
    }
  </style>
</head>
<body>
  <h1>🚀 BotFlow Admin Panel</h1>
  <p>Restaurant SaaS MVP dashboard</p>

  <a class="refresh" href="/admin">🔄 Refresh</a>

  <div class="cards">
    <div class="card"><b>🛒 Orders</b><br>${orders.length}</div>
    <div class="card"><b>👥 Clients</b><br>${clients.size}</div>
    <div class="card"><b>💰 Revenue</b><br>${money(revenue)}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Order ID</th>
        <th>Restaurant</th>
        <th>Customer</th>
        <th>Phone</th>
        <th>Address</th>
        <th>Total</th>
        <th>Status</th>
        <th>Date</th>
        <th>Admin Action</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>
`);
});

app.post("/admin/status", async (req, res) => {
  const { orderId, status } = req.body;

  const order = await updateOrderStatus(orderId, status);

  if (order && order.chatId) {
    await bot.sendMessage(
      order.chatId,
      `📌 Buyurtma holati yangilandi:

🏷 ${order.orderId}
${status}`
    );
  }

  res.redirect("/admin");
});

/* ===================== TELEGRAM BOT ===================== */

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  resetSession(chatId);

  bot.sendMessage(
    chatId,
    `🚀 BotFlow AI

1 ta bot ichida bir nechta restoran:
🍔 Burger
🍣 Sushi
☕ Coffee

Buyurtma berish uchun restoranni tanlang.`,
    mainKeyboard()
  );

  return askRestaurant(chatId);
});

bot.onText(/\/orders/, async (msg) => {
  if (msg.chat.id.toString() !== ADMIN_CHAT_ID.toString()) return;
  const orders = await getOrders();
  bot.sendMessage(msg.chat.id, `🛒 Jami orderlar: ${orders.length}`);
});

bot.onText(/\/revenue/, async (msg) => {
  if (msg.chat.id.toString() !== ADMIN_CHAT_ID.toString()) return;
  const orders = await getOrders();
  const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  bot.sendMessage(msg.chat.id, `💰 Jami tushum: ${money(revenue)}`);
});

bot.onText(/\/clients/, async (msg) => {
  if (msg.chat.id.toString() !== ADMIN_CHAT_ID.toString()) return;
  const orders = await getOrders();
  const clients = new Set(orders.map((o) => o.phone));
  bot.sendMessage(msg.chat.id, `👥 Klientlar soni: ${clients.size}`);
});

bot.onText(/\/last/, async (msg) => {
  if (msg.chat.id.toString() !== ADMIN_CHAT_ID.toString()) return;
  const orders = await getOrders();

  if (orders.length === 0) return bot.sendMessage(msg.chat.id, "Orderlar yo‘q.");

  const last = orders[orders.length - 1];

  bot.sendMessage(
    msg.chat.id,
    `🛒 OXIRGI ORDER

🏷 ${last.orderId}
🏪 ${last.restaurant}
👤 ${last.customer}
💰 ${money(last.total)}
📞 ${last.phone}
📍 ${last.address}
📌 Status: ${last.status || "Yangi"}`
  );
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || "").toLowerCase().trim();
  const rawText = msg.text || "";
  const session = getSession(chatId);
  const restaurant = getRestaurant(session);

  if (!text || text === "/start" || text.startsWith("/")) return;

  if (text.includes("bekor")) {
    resetSession(chatId);
    return bot.sendMessage(chatId, "❌ Buyurtma bekor qilindi.", mainKeyboard());
  }

  if (text.includes("restoran")) {
    session.items = [];
    session.restaurantId = null;
    session.step = "choose_restaurant";
    return askRestaurant(chatId);
  }

  if (text.includes("menu")) {
    if (!restaurant) return askRestaurant(chatId);
    return bot.sendMessage(chatId, menuText(restaurant), menuKeyboard(restaurant));
  }

  if (text.includes("savat")) {
    if (session.items.length === 0) return bot.sendMessage(chatId, "🛒 Savat bo‘sh.");
    return bot.sendMessage(chatId, summary(session), cartKeyboard());
  }

  if (text.includes("statistika") || text.includes("stat")) {
    return sendStatistics(chatId);
  }

  if (text.includes("location") || text.includes("manzil")) {
    if (!restaurant) return askRestaurant(chatId);
    return bot.sendMessage(chatId, `📍 Manzil: ${restaurant.address}\n🗺 ${restaurant.maps}`);
  }

  if (text.includes("admin") || text.includes("operator")) {
    if (!restaurant) return askRestaurant(chatId);
    return bot.sendMessage(chatId, `☎️ Admin: ${restaurant.phone}`);
  }

  if (text.includes("bron")) {
    if (!restaurant) return askRestaurant(chatId);
    session.step = "booking";
    return bot.sendMessage(chatId, `🪑 ${restaurant.name} uchun bron:\n\nAli, 19:00, 4 kishi`);
  }

  if (session.step === "booking") {
    const bookingId = "BRON-" + Date.now().toString().slice(-5);

    await bot.sendMessage(chatId, `✅ Bron qabul qilindi!\n\n🏷 Bron raqami: ${bookingId}`);

    await bot.sendMessage(
      ADMIN_CHAT_ID,
      `🪑 YANGI BRON

🏷 Bron ID: ${bookingId}
🏪 Restoran: ${restaurant.name}
👤 Mijoz: ${msg.from.first_name || "Noma’lum"}
🆔 Chat ID: ${chatId}
📩 Ma’lumot: ${msg.text}`
    );

    session.step = "idle";
    return;
  }

  if (session.step === "phone") {
    session.phone = msg.text;
    session.step = "address";
    return bot.sendMessage(chatId, "📍 Yetkazib berish manzilini yuboring.");
  }

  if (session.step === "address") {
    session.address = msg.text;
    session.step = "confirm";

    return bot.sendMessage(
      chatId,
      `${summary(session)}

🏪 Restoran: ${restaurant.name}
📞 Telefon: ${session.phone}
📍 Manzil: ${session.address}

Tasdiqlaysizmi?`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ Tasdiqlash", callback_data: "confirm" }],
            [{ text: "❌ Bekor qilish", callback_data: "cancel" }],
          ],
        },
      }
    );
  }

  try {
    const aiText = await aiWaiterReply(rawText, restaurant);
    return bot.sendMessage(chatId, aiText);
  } catch (error) {
    console.log("AI error:", error.message);
    return bot.sendMessage(
      chatId,
      "🤖 Hozircha tushunmadim. Buyurtma uchun 📋 Menu ni bosing."
    );
  }
});

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const session = getSession(chatId);

  await bot.answerCallbackQuery(query.id);

  if (data.startsWith("restaurant_")) {
    const restaurantId = data.replace("restaurant_", "");
    const restaurant = restaurants[restaurantId];

    if (!restaurant) return bot.sendMessage(chatId, "Restoran topilmadi.");

    session.restaurantId = restaurantId;
    session.items = [];
    session.step = "idle";

    await bot.sendMessage(chatId, `✅ ${restaurant.name} tanlandi.`, mainKeyboard());
    return bot.sendMessage(chatId, menuText(restaurant), menuKeyboard(restaurant));
  }

  if (data.startsWith("food_")) {
    const restaurant = getRestaurant(session);
    if (!restaurant) return askRestaurant(chatId);

    const key = data.replace("food_", "");
    const item = restaurant.menu[key];

    if (!item) return bot.sendMessage(chatId, "Mahsulot topilmadi.");

    session.items.push(item);

    return bot.sendMessage(
      chatId,
      `✅ ${item.name} savatga qo‘shildi.

${summary(session)}`,
      cartKeyboard()
    );
  }

  if (data === "more") {
    const restaurant = getRestaurant(session);
    if (!restaurant) return askRestaurant(chatId);
    return bot.sendMessage(chatId, menuText(restaurant), menuKeyboard(restaurant));
  }

  if (data === "cart") {
    if (session.items.length === 0) return bot.sendMessage(chatId, "🛒 Savat bo‘sh.");
    return bot.sendMessage(chatId, summary(session), cartKeyboard());
  }

  if (data === "clear_cart") {
    session.items = [];
    session.step = "idle";
    return bot.sendMessage(chatId, "🧹 Savat tozalandi.", mainKeyboard());
  }

  if (data === "finish") {
    if (session.items.length === 0) return bot.sendMessage(chatId, "🛒 Savat bo‘sh.");
    session.step = "phone";
    return bot.sendMessage(chatId, "📞 Telefon raqamingizni yuboring.");
  }

  if (data === "cancel") {
    resetSession(chatId);
    return bot.sendMessage(chatId, "❌ Buyurtma bekor qilindi.", mainKeyboard());
  }

  if (data === "confirm") {
    const restaurant = getRestaurant(session);
    if (!restaurant) return askRestaurant(chatId);

    const orderId = "ORDER-" + Date.now().toString().slice(-6);
    const orderTotal = total(session);

    const order = {
      orderId,
      restaurant: restaurant.name,
      restaurantId: restaurant.id,
      customer: query.from.first_name || "Noma’lum",
      chatId,
      phone: session.phone,
      address: session.address,
      items: session.items,
      total: orderTotal,
      status: "Yangi",
      createdAt: new Date().toISOString(),
    };

    await saveOrder(order);

    await bot.sendMessage(
      chatId,
      `✅ Buyurtmangiz qabul qilindi!

🏷 Buyurtma raqami: ${orderId}
🏪 Restoran: ${restaurant.name}`
    );

    await bot.sendMessage(
      ADMIN_CHAT_ID,
      `🛒 YANGI BUYURTMA

🏷 Order ID: ${orderId}
🏪 Restoran: ${restaurant.name}
👤 Mijoz: ${query.from.first_name || "Noma’lum"}
🆔 Chat ID: ${chatId}

${summary(session)}

📞 Telefon: ${session.phone}
📍 Manzil: ${session.address}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Qabul qilindi", callback_data: `status_accept_${orderId}_${chatId}` },
              { text: "🚚 Yo‘lda", callback_data: `status_delivery_${orderId}_${chatId}` },
            ],
            [{ text: "❌ Bekor qilindi", callback_data: `status_cancel_${orderId}_${chatId}` }],
          ],
        },
      }
    );

    resetSession(chatId);
    return;
  }

  if (data.startsWith("status_")) {
    const parts = data.split("_");
    const action = parts[1];
    const orderId = parts[2];
    const customerChatId = parts[3];

    let statusText = "📌 Buyurtma statusi yangilandi.";
    if (action === "accept") statusText = "✅ Qabul qilindi";
    if (action === "delivery") statusText = "🚗 Yo‘lda";
    if (action === "cancel") statusText = "❌ Bekor qilindi";

    await updateOrderStatus(orderId, statusText);

    await bot.sendMessage(customerChatId, `📌 Buyurtma holati:\n${statusText}`);
    await bot.sendMessage(chatId, `📌 ${orderId} statusi yangilandi:\n${statusText}`);
    return;
  }
});

ensureDataFile();

app.listen(PORT, () => {
  console.log(`🌐 Admin panel ishlayapti: port ${PORT}`);
});

console.log("🚀 BotFlow Admin Control SaaS ishlayapti...");