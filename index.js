require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs-extra");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const ORDERS_FILE = "./data/orders.json";

const restaurant = {
  name: "BotFlow Burger",
  phone: "+998 90 777 70 70",
  address: "Toshkent shahar, Chilonzor, Bunyodkor shoh ko‘chasi",
  maps: "https://maps.google.com",
};

const menu = {
  classic_burger: { name: "🍔 Classic Burger", price: 32000 },
  cheese_burger: { name: "🧀 Cheese Burger", price: 38000 },
  lavash: { name: "🌯 Tovuqli Lavash", price: 30000 },
  hot_dog: { name: "🌭 Hot Dog", price: 22000 },
  fries: { name: "🍟 Fri", price: 15000 },
  cola: { name: "🥤 Cola", price: 10000 },
};

let orderCounter = 1000;
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

async function saveOrder(order) {
  const orders = await getOrders();
  orders.push(order);
  await fs.writeJson(ORDERS_FILE, orders, { spaces: 2 });
}

async function updateOrderStatus(orderId, status) {
  const orders = await getOrders();
  const order = orders.find((o) => o.orderId === orderId);
  if (order) order.status = status;
  await fs.writeJson(ORDERS_FILE, orders, { spaces: 2 });
  return order;
}

function getSession(chatId) {
  if (!sessions[chatId]) {
    sessions[chatId] = { items: [], step: "idle", phone: "", address: "" };
  }
  return sessions[chatId];
}

function resetSession(chatId) {
  sessions[chatId] = { items: [], step: "idle", phone: "", address: "" };
}

function money(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " so‘m";
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

function mainKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        ["📋 Menu", "🧾 Savat"],
        ["🪑 Bron", "📍 Location"],
        ["☎️ Admin", "📊 Statistika"],
        ["❌ Bekor qilish"],
      ],
      resize_keyboard: true,
    },
  };
}

function menuText() {
  return `🍽 ${restaurant.name} MENU:

🍔 Classic Burger — 32 000 so‘m
🧀 Cheese Burger — 38 000 so‘m
🌯 Tovuqli Lavash — 30 000 so‘m
🌭 Hot Dog — 22 000 so‘m
🍟 Fri — 15 000 so‘m
🥤 Cola — 10 000 so‘m

👇 Tanlang:`;
}

function menuKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🍔 Classic Burger", callback_data: "food_classic_burger" },
          { text: "🧀 Cheese Burger", callback_data: "food_cheese_burger" },
        ],
        [
          { text: "🌯 Lavash", callback_data: "food_lavash" },
          { text: "🌭 Hot Dog", callback_data: "food_hot_dog" },
        ],
        [
          { text: "🍟 Fri", callback_data: "food_fries" },
          { text: "🥤 Cola", callback_data: "food_cola" },
        ],
        [{ text: "🧾 Savat", callback_data: "cart" }],
      ],
    },
  };
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

  if (orders.length === 0) {
    return bot.sendMessage(chatId, "📊 Hali orderlar yo‘q.");
  }

  const revenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const clients = new Set(orders.map((o) => o.phone));

  return bot.sendMessage(
    chatId,
    `📊 ${restaurant.name} statistikasi:

🛒 Jami orderlar: ${orders.length}
👥 Klientlar: ${clients.size}
💰 Jami savdo: ${money(revenue)}
🕒 Oxirgi order: ${orders[orders.length - 1].orderId}`
  );
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  resetSession(chatId);

  bot.sendMessage(
    chatId,
    `🍔 ${restaurant.name} ga xush kelibsiz!

Men buyurtma olish, stol bron qilish va admin bilan bog‘lashga yordam beraman.`,
    mainKeyboard()
  );
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

  if (orders.length === 0) {
    return bot.sendMessage(msg.chat.id, "Orderlar yo‘q.");
  }

  const last = orders[orders.length - 1];

  bot.sendMessage(
    msg.chat.id,
    `🛒 OXIRGI ORDER

🏷 ${last.orderId}
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
  const session = getSession(chatId);

  if (!text || text === "/start" || text.startsWith("/")) return;

  if (text.includes("bekor")) {
    resetSession(chatId);
    return bot.sendMessage(chatId, "❌ Buyurtma bekor qilindi.", mainKeyboard());
  }

  if (text.includes("menu")) {
    return bot.sendMessage(chatId, menuText(), menuKeyboard());
  }

  if (text.includes("savat")) {
    if (session.items.length === 0) return bot.sendMessage(chatId, "🛒 Savat bo‘sh.");
    return bot.sendMessage(chatId, summary(session), cartKeyboard());
  }

  if (text.includes("statistika") || text.includes("stat")) {
    return sendStatistics(chatId);
  }

  if (text.includes("location") || text.includes("manzil")) {
    return bot.sendMessage(chatId, `📍 Manzil: ${restaurant.address}\n🗺 ${restaurant.maps}`);
  }

  if (text.includes("admin") || text.includes("operator")) {
    return bot.sendMessage(chatId, `☎️ Admin: ${restaurant.phone}`);
  }

  if (text.includes("bron")) {
    session.step = "booking";
    return bot.sendMessage(chatId, "🪑 Bron uchun yozing:\n\nAli, 19:00, 4 kishi");
  }

  if (session.step === "booking") {
    const bookingId = "BRON-" + Date.now().toString().slice(-5);

    await bot.sendMessage(chatId, `✅ Bron qabul qilindi!\n🏷 Bron raqami: ${bookingId}`);

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

  return bot.sendMessage(chatId, "Tushunmadim. Buyurtma berish uchun 📋 Menu ni bosing.");
});

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const session = getSession(chatId);

  await bot.answerCallbackQuery(query.id);

  if (data.startsWith("food_")) {
    const key = data.replace("food_", "");
    const item = menu[key];

    if (!item) return bot.sendMessage(chatId, "Mahsulot topilmadi.");

    session.items.push(item);

    return bot.sendMessage(chatId, `✅ ${item.name} savatga qo‘shildi.\n\n${summary(session)}`, cartKeyboard());
  }

  if (data === "more") {
    return bot.sendMessage(chatId, menuText(), menuKeyboard());
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
    const orderId = "ORDER-" + orderCounter++;
    const orderTotal = total(session);

    const order = {
      orderId,
      restaurant: restaurant.name,
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

Admin tez orada bog‘lanadi.`
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

    let statusText = "Yangilandi";

    if (action === "accept") statusText = "✅ Buyurtmangiz qabul qilindi.";
    if (action === "delivery") statusText = "🚚 Buyurtmangiz yo‘lga chiqdi.";
    if (action === "cancel") statusText = "❌ Buyurtmangiz bekor qilindi.";

    await updateOrderStatus(orderId, statusText);

    await bot.sendMessage(customerChatId, statusText);
    await bot.sendMessage(chatId, `📌 ${orderId} statusi yangilandi:\n${statusText}`);
    return;
  }
});

ensureDataFile();
console.log("🚀 BotFlow Burger FINAL ishlayapti...");