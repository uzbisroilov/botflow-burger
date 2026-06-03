const { saveOrder, updateOrderStatus, STATUSES } = require("../services/orderService");
const { createPaymentLink } = require("../services/paymentService");
const { getMenus } = require("../services/menuService");

const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const APP_URL = process.env.APP_URL || "https://botflow-burger-production.up.railway.app";

const sessions = {};
let restaurants = {};

async function loadMenus() {
  restaurants = await getMenus();
}

function money(n) {
  return (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " so‘m";
}

function getSession(chatId) {
  if (!sessions[chatId]) {
    sessions[chatId] = {
      restaurantId: null,
      table: null,
      items: [],
      step: "idle",
      phone: "",
      address: "",
      location: null,
      paymentType: "cash",
    };
  }
  return sessions[chatId];
}

function resetSession(chatId) {
  sessions[chatId] = {
    restaurantId: null,
    table: null,
    items: [],
    step: "idle",
    phone: "",
    address: "",
    location: null,
    paymentType: "cash",
  };
}

function isAdminGroup(chatId) {
  return ADMIN_CHAT_ID && chatId.toString() === ADMIN_CHAT_ID.toString();
}

function mainKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        [
          { text: "🏪 Restoran tanlash" },
          { text: "📋 Menu", web_app: { url: `${APP_URL}/menu` } },
        ],
        ["🧾 Savat", "❌ Bekor qilish"],
      ],
      resize_keyboard: true,
    },
  };
}

function locationKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        [{ text: "📍 Lokatsiya yuborish", request_location: true }],
        ["➡️ Manzil bilan davom etish"],
        ["❌ Bekor qilish"],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  };
}

function restaurantKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🍔 BotFlow Burger", callback_data: "restaurant_burger" }],
        [{ text: "🍣 Sushi Master", callback_data: "restaurant_sushi" }],
        [{ text: "☕ Coffee Time", callback_data: "restaurant_coffee" }],
      ],
    },
  };
}

function getRestaurant(session) {
  if (!session.restaurantId) return null;
  return restaurants[session.restaurantId] || null;
}

function total(session) {
  return session.items.reduce((sum, item) => sum + Number(item.price || 0), 0);
}

function summary(session) {
  if (!session.items.length) return "🛒 Savat bo‘sh.";

  let text = "🧾 Buyurtma:\n\n";
  session.items.forEach((item, i) => {
    text += `${i + 1}. ${item.name} — ${money(item.price)}\n`;
  });
  text += `\n💰 Jami: ${money(total(session))}`;
  return text;
}

function paymentName(type) {
  if (type === "click") return "💳 Click";
  if (type === "payme") return "💳 Payme";
  return "💵 Naqd";
}

function statusKeyboard(orderId, chatId) {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "✅ Qabul", callback_data: `status_accepted_${orderId}_${chatId}` }],
        [{ text: "👨‍🍳 Tayyor", callback_data: `status_cooking_${orderId}_${chatId}` }],
        [{ text: "🚗 Yo‘lda", callback_data: `status_delivery_${orderId}_${chatId}` }],
        [{ text: "🎉 Yetkazildi", callback_data: `status_delivered_${orderId}_${chatId}` }],
        [{ text: "❌ Bekor", callback_data: `status_cancelled_${orderId}_${chatId}` }],
      ],
    },
  };
}

async function createOrder(bot, chatId, queryFrom = null) {
  await loadMenus();

  const session = getSession(chatId);
  const restaurant = getRestaurant(session);

  if (!restaurant || !session.items.length) {
    return bot.sendMessage(chatId, "Buyurtma topilmadi.", mainKeyboard());
  }

  const orderId = "ORDER-" + Date.now().toString().slice(-6);

  const order = {
    orderId,
    restaurant: restaurant.name,
    restaurantId: restaurant.id,
    customer: queryFrom?.first_name || "Client",
    chatId,
    phone: session.phone,
    address: session.address,
    location: session.location || null,
    paymentType: session.paymentType || "cash",
    paymentName: paymentName(session.paymentType || "cash"),
    items: session.items,
    total: total(session),
    status: "🆕 Yangi",
    createdAt: new Date().toISOString(),
  };

  await saveOrder(order);

  const paymentLink = createPaymentLink(order);
  const locationLink = order.location
    ? `https://maps.google.com/?q=${order.location.latitude},${order.location.longitude}`
    : "";

  await bot.sendMessage(
    chatId,
    `✅ Buyurtma qabul qilindi

🏷 ${orderId}
🏪 ${restaurant.name}
💰 ${money(order.total)}
💳 To‘lov: ${order.paymentName}

${paymentLink ? `🔗 To‘lov linki:\n${paymentLink}` : ""}`,
    mainKeyboard()
  );

  if (ADMIN_CHAT_ID) {
    await bot.sendMessage(
      ADMIN_CHAT_ID,
      `🛒 YANGI ORDER

🏷 ${orderId}
🏪 ${restaurant.name}
👤 ${order.customer}

${summary(session)}

💳 To‘lov: ${order.paymentName}
📞 ${session.phone}
📍 ${session.address}
${locationLink ? `\n🗺 Location: ${locationLink}` : ""}`,
      statusKeyboard(orderId, chatId)
    );
  }

  resetSession(chatId);
}

function registerBot(bot) {
  loadMenus();

  bot.onText(/\/id/, (msg) => {
    bot.sendMessage(msg.chat.id, `🆔 Chat ID: ${msg.chat.id}`);
  });

  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    if (isAdminGroup(chatId)) return;

    resetSession(chatId);
    await loadMenus();

    await bot.sendMessage(
      chatId,
      `🚀 BotFlow AI

1 bot ichida:
🍔 Burger
🍣 Sushi
☕ Coffee`,
      mainKeyboard()
    );

    return bot.sendMessage(chatId, "📋 Buyurtma berish uchun Menu tugmasini bosing.");
  });

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    if (isAdminGroup(chatId)) return;

    await loadMenus();
    const session = getSession(chatId);

    if (msg.web_app_data && msg.web_app_data.data) {
      try {
        const data = JSON.parse(msg.web_app_data.data);

        if (data.type === "web_order_full") {
          session.restaurantId = data.restaurantId;
          session.items = data.items || [];
          session.phone = data.phone || "";
          session.address = data.address || "";
          session.paymentType = data.paymentType || "cash";
          session.location = data.location || null;
          session.step = "wait_location";

          return bot.sendMessage(
            chatId,
            `${summary(session)}

📍 Yetkazish uchun lokatsiya yuboring yoki manzil bilan davom eting.`,
            locationKeyboard()
          );
        }

        if (data.type === "web_order") {
          session.restaurantId = data.restaurantId;
          session.items = data.items || [];
          session.step = "phone";

          return bot.sendMessage(chatId, `${summary(session)}\n\n📞 Telefon raqamingizni yuboring.`);
        }
      } catch (error) {
        return bot.sendMessage(chatId, "❌ Web menu ma’lumoti xato keldi.", mainKeyboard());
      }
    }

    if (msg.location) {
      session.location = {
        latitude: msg.location.latitude,
        longitude: msg.location.longitude,
      };

      if (session.step === "wait_location") {
        return createOrder(bot, chatId, msg.from);
      }

      return bot.sendMessage(chatId, "✅ Lokatsiya qabul qilindi.", mainKeyboard());
    }

    const text = (msg.text || "").toLowerCase();
    if (!text || text.startsWith("/")) return;

    if (text.includes("bekor")) {
      resetSession(chatId);
      return bot.sendMessage(chatId, "❌ Bekor qilindi.", mainKeyboard());
    }

    if (text.includes("manzil bilan davom")) {
      if (session.step === "wait_location") {
        return createOrder(bot, chatId, msg.from);
      }
    }

    if (text.includes("menu")) {
      return bot.sendMessage(chatId, "📋 Pastdagi Menu tugmasini bosing.", mainKeyboard());
    }

    if (text.includes("savat")) {
      return bot.sendMessage(chatId, summary(session));
    }

    if (session.step === "phone") {
      session.phone = msg.text;
      session.step = "address";
      return bot.sendMessage(chatId, "📍 Manzil yuboring.");
    }

    if (session.step === "address") {
      session.address = msg.text;
      session.step = "wait_location";

      return bot.sendMessage(
        chatId,
        `${summary(session)}

📍 Lokatsiya yuboring yoki manzil bilan davom eting.`,
        locationKeyboard()
      );
    }

    return bot.sendMessage(chatId, "📋 Buyurtma berish uchun Menu tugmasini bosing.", mainKeyboard());
  });

  bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    await bot.answerCallbackQuery(query.id);

    if (data.startsWith("status_")) {
      const parts = data.split("_");
      const action = parts[1];
      const orderId = parts[2];
      const customerChatId = parts[3];

      const statusText = STATUSES[action] || "📌 Status yangilandi";

      await updateOrderStatus(orderId, statusText);
      await bot.sendMessage(customerChatId, `📌 Buyurtma holati:\n\n${statusText}`);
      await bot.sendMessage(chatId, `✅ ${orderId}\n\n${statusText}`);
    }
  });
}

module.exports = { registerBot };