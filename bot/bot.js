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

function menuText(restaurant) {
  let text = `🍽 ${restaurant.name} MENU:\n\n`;

  Object.values(restaurant.menu || {}).forEach((item) => {
    text += `${item.name} — ${money(item.price)}\n`;
  });

  return text;
}

function menuKeyboard(restaurant) {
  const buttons = [];

  Object.entries(restaurant.menu || {}).forEach(([key, item]) => {
    buttons.push([{ text: item.name, callback_data: `food_${key}` }]);
  });

  buttons.push([{ text: "🧾 Savat", callback_data: "cart" }]);

  return {
    reply_markup: {
      inline_keyboard: buttons,
    },
  };
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

function cartKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "➕ Yana qo‘shish", callback_data: "more" },
          { text: "✅ Yakunlash", callback_data: "finish" },
        ],
      ],
    },
  };
}

function paymentKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "💳 Click", callback_data: "payment_click" }],
        [{ text: "💳 Payme", callback_data: "payment_payme" }],
        [{ text: "💵 Naqd", callback_data: "payment_cash" }],
      ],
    },
  };
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

async function openRestaurant(bot, chatId, restaurantId) {
  await loadMenus();

  const session = getSession(chatId);
  session.restaurantId = restaurantId;
  session.items = [];
  session.step = "idle";

  const restaurant = restaurants[restaurantId];

  if (!restaurant) {
    return bot.sendMessage(chatId, "❌ Restoran topilmadi.", restaurantKeyboard());
  }

  return bot.sendMessage(chatId, menuText(restaurant), menuKeyboard(restaurant));
}

async function createOrder(bot, chatId, queryFrom = null) {
  const session = getSession(chatId);
  const restaurant = getRestaurant(session);

  if (!restaurant || !session.items.length) {
    return bot.sendMessage(chatId, "Buyurtma topilmadi.");
  }

  const orderId = "ORDER-" + Date.now().toString().slice(-6);

  const order = {
    orderId,
    restaurant: restaurant.name,
    restaurantId: restaurant.id,
    customer: queryFrom?.first_name || "Noma’lum",
    chatId,
    phone: session.phone,
    address: session.address,
    paymentType: session.paymentType || "cash",
    paymentName: paymentName(session.paymentType || "cash"),
    items: session.items,
    total: total(session),
    status: "🆕 Yangi",
    createdAt: new Date().toISOString(),
  };

  await saveOrder(order);

  const paymentLink = createPaymentLink(order);

  await bot.sendMessage(
    chatId,
    `✅ Buyurtma qabul qilindi

🏷 ${orderId}
🏪 ${restaurant.name}
💰 ${money(order.total)}
💳 To‘lov: ${order.paymentName}
${paymentLink ? `\n🔗 To‘lov linki:\n${paymentLink}` : ""}`
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
📍 ${session.address}`,
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

    if (isAdminGroup(chatId)) {
      return;
    }

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

    return bot.sendMessage(chatId, "🏪 Restoran tanlang:", restaurantKeyboard());
  });

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;

    if (isAdminGroup(chatId)) return;

    await loadMenus();

    if (msg.web_app_data && msg.web_app_data.data) {
      try {
        const data = JSON.parse(msg.web_app_data.data);

        if (data.type === "web_order") {
          const session = getSession(chatId);
          session.restaurantId = data.restaurantId;
          session.items = data.items || [];
          session.step = "phone";

          return bot.sendMessage(
            chatId,
            `${summary(session)}

📞 Telefon raqamingizni yuboring.`
          );
        }
      } catch (error) {
        return bot.sendMessage(chatId, "Web menu ma’lumoti xato keldi.");
      }
    }

    const text = (msg.text || "").toLowerCase();

    if (!text || text.startsWith("/")) return;

    const session = getSession(chatId);
    const restaurant = getRestaurant(session);

    if (text.includes("bekor")) {
      resetSession(chatId);
      return bot.sendMessage(chatId, "❌ Bekor qilindi.", mainKeyboard());
    }

    if (text.includes("restoran")) {
      return bot.sendMessage(chatId, "🏪 Restoran tanlang:", restaurantKeyboard());
    }

    if (text.includes("menu")) {
      return bot.sendMessage(
        chatId,
        "📋 Menu ochish uchun pastdagi Menu tugmasini bosing.",
        mainKeyboard()
      );
    }

    if (text.includes("savat")) {
      return bot.sendMessage(chatId, summary(session), cartKeyboard());
    }

    if (session.step === "phone") {
      session.phone = msg.text;
      session.step = "address";
      return bot.sendMessage(chatId, "📍 Manzil yuboring.");
    }

    if (session.step === "address") {
      session.address = msg.text;
      session.step = "payment";

      return bot.sendMessage(
        chatId,
        `${summary(session)}

📞 Telefon: ${session.phone}
📍 Manzil: ${session.address}

💳 To‘lov turini tanlang:`,
        paymentKeyboard()
      );
    }

    return bot.sendMessage(chatId, "Buyurtma berish uchun 📋 Menu tugmasini bosing.", mainKeyboard());
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
      return;
    }

    if (isAdminGroup(chatId)) return;

    await loadMenus();

    const session = getSession(chatId);

    if (data.startsWith("restaurant_")) {
      const restaurantId = data.replace("restaurant_", "");
      return openRestaurant(bot, chatId, restaurantId);
    }

    if (data.startsWith("food_")) {
      const restaurant = getRestaurant(session);

      if (!restaurant) {
        return bot.sendMessage(chatId, "Avval restoran tanlang.", restaurantKeyboard());
      }

      const key = data.replace("food_", "");
      const item = restaurant.menu[key];

      if (!item) {
        return bot.sendMessage(chatId, "Mahsulot topilmadi.");
      }

      session.items.push(item);

      return bot.sendMessage(
        chatId,
        `✅ ${item.name} qo‘shildi

${summary(session)}`,
        cartKeyboard()
      );
    }

    if (data === "more") {
      const restaurant = getRestaurant(session);

      if (!restaurant) {
        return bot.sendMessage(chatId, "Avval restoran tanlang.", restaurantKeyboard());
      }

      return bot.sendMessage(chatId, menuText(restaurant), menuKeyboard(restaurant));
    }

    if (data === "cart") {
      return bot.sendMessage(chatId, summary(session), cartKeyboard());
    }

    if (data === "finish") {
      if (!session.items.length) {
        return bot.sendMessage(chatId, "🛒 Savat bo‘sh.");
      }

      session.step = "phone";
      return bot.sendMessage(chatId, "📞 Telefon yuboring.");
    }

    if (data.startsWith("payment_")) {
      const paymentType = data.replace("payment_", "");
      session.paymentType = paymentType;

      return createOrder(bot, chatId, query.from);
    }
  });
}

module.exports = { registerBot };