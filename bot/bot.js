const { restaurants } = require("../appconfig/restaurants");
const { saveOrder, updateOrderStatus, STATUSES } = require("../services/orderService");
const { aiWaiterReply } = require("../services/aiService");

const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const sessions = {};

function money(n) {
  return ((n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " so‘m");
}

function getSession(chatId) {
  if (!sessions[chatId]) {
    sessions[chatId] = {
      restaurantId: null,
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
    items: [],
    step: "idle",
    phone: "",
    address: "",
  };
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

function mainKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        ["🏪 Restoran tanlash", "📋 Menu"],
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
        [{ text: restaurants.burger.name, callback_data: "restaurant_burger" }],
        [{ text: restaurants.sushi.name, callback_data: "restaurant_sushi" }],
        [{ text: restaurants.coffee.name, callback_data: "restaurant_coffee" }],
      ],
    },
  };
}

function menuText(restaurant) {
  let text = `🍽 ${restaurant.name} MENU:\n\n`;

  Object.values(restaurant.menu).forEach((item) => {
    text += `${item.name} — ${money(item.price)}\n`;
  });

  return text;
}

function menuKeyboard(restaurant) {
  const buttons = [];

  Object.entries(restaurant.menu).forEach(([key, item]) => {
    buttons.push([{ text: item.name, callback_data: `food_${key}` }]);
  });

  buttons.push([{ text: "🧾 Savat", callback_data: "cart" }]);

  return {
    reply_markup: {
      inline_keyboard: buttons,
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

function statusKeyboard(orderId, chatId) {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "✅ Qabul", callback_data: `status_accepted_${orderId}_${chatId}` }],
        [{ text: "👨‍🍳 Tayyorlanmoqda", callback_data: `status_cooking_${orderId}_${chatId}` }],
        [{ text: "🚗 Yo‘lda", callback_data: `status_delivery_${orderId}_${chatId}` }],
        [{ text: "🎉 Yetkazildi", callback_data: `status_delivered_${orderId}_${chatId}` }],
        [{ text: "❌ Bekor", callback_data: `status_cancelled_${orderId}_${chatId}` }],
      ],
    },
  };
}

function paymentName(type) {
  if (type === "click") return "💳 Click";
  if (type === "payme") return "💳 Payme";
  return "💵 Naqd";
}

function isAdminGroup(chatId) {
  return ADMIN_CHAT_ID && chatId.toString() === ADMIN_CHAT_ID.toString();
}

function askRestaurant(bot, chatId) {
  return bot.sendMessage(chatId, "🏪 Restoran tanlang:", restaurantKeyboard());
}

function registerBot(bot) {
  bot.onText(/\/id/, (msg) => {
    bot.sendMessage(msg.chat.id, `🆔 Chat ID: ${msg.chat.id}`);
  });

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    if (isAdminGroup(chatId)) {
      return bot.sendMessage(chatId, "✅ Admin group ulangan. Buyurtmalar shu yerga keladi.");
    }

    resetSession(chatId);

    bot.sendMessage(
      chatId,
      `🚀 BotFlow AI

1 bot ichida:
🍔 Burger
🍣 Sushi
☕ Coffee`,
      mainKeyboard()
    );

    bot.sendMessage(chatId, "🏪 Restoran tanlang:", restaurantKeyboard());
  });

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const rawText = msg.text || "";
    const text = rawText.toLowerCase().trim();

    if (!text || text.startsWith("/")) return;

    if (isAdminGroup(chatId)) {
      return;
    }

    const session = getSession(chatId);
    const restaurant = getRestaurant(session);

    if (text.includes("bekor")) {
      resetSession(chatId);
      return bot.sendMessage(chatId, "❌ Bekor qilindi.", mainKeyboard());
    }

    if (text.includes("restoran")) {
      return askRestaurant(bot, chatId);
    }

    if (text.includes("menu")) {
      if (!restaurant) {
        return bot.sendMessage(chatId, "Avval restoran tanlang.", restaurantKeyboard());
      }

      return bot.sendMessage(chatId, menuText(restaurant), menuKeyboard(restaurant));
    }

    if (text.includes("savat")) {
      if (session.items.length === 0) {
        return bot.sendMessage(chatId, "🛒 Savat bo‘sh.");
      }

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

    try {
      const aiText = await aiWaiterReply(rawText, restaurant, restaurants);
      return bot.sendMessage(chatId, aiText);
    } catch (error) {
      console.log("AI error:", error.message);
      return bot.sendMessage(
        chatId,
        "Buyurtma berish uchun 📋 Menu ni bosing yoki 🏪 Restoran tanlang."
      );
    }
  });

  bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const session = getSession(chatId);

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

    if (isAdminGroup(chatId)) {
      return;
    }

    if (data.startsWith("restaurant_")) {
      const restaurantId = data.replace("restaurant_", "");
      session.restaurantId = restaurantId;
      session.items = [];
      session.step = "idle";

      const restaurant = restaurants[restaurantId];

      return bot.sendMessage(chatId, menuText(restaurant), menuKeyboard(restaurant));
    }

    if (data.startsWith("food_")) {
      const restaurant = getRestaurant(session);

      if (!restaurant) {
        return bot.sendMessage(chatId, "Avval restoran tanlang.", restaurantKeyboard());
      }

      const key = data.replace("food_", "");
      const item = restaurant.menu[key];

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
      if (session.items.length === 0) {
        return bot.sendMessage(chatId, "🛒 Savat bo‘sh.");
      }

      return bot.sendMessage(chatId, summary(session), cartKeyboard());
    }

    if (data === "finish") {
      if (session.items.length === 0) {
        return bot.sendMessage(chatId, "🛒 Savat bo‘sh.");
      }

      session.step = "phone";
      return bot.sendMessage(chatId, "📞 Telefon yuboring.");
    }

    if (data.startsWith("payment_")) {
      const paymentType = data.replace("payment_", "");
      const restaurant = getRestaurant(session);

      if (!restaurant) {
        return bot.sendMessage(chatId, "Avval restoran tanlang.", restaurantKeyboard());
      }

      if (session.items.length === 0) {
        return bot.sendMessage(chatId, "🛒 Savat bo‘sh.");
      }

      const orderId = "ORDER-" + Date.now().toString().slice(-6);

      const order = {
        orderId,
        restaurant: restaurant.name,
        restaurantId: restaurant.id,
        customer: query.from.first_name || "Noma’lum",
        chatId,
        phone: session.phone,
        address: session.address,
        paymentType,
        paymentName: paymentName(paymentType),
        items: session.items,
        total: total(session),
        status: "🆕 Yangi",
        createdAt: new Date().toISOString(),
      };

      await saveOrder(order);

      await bot.sendMessage(
        chatId,
        `✅ Buyurtma qabul qilindi

🏷 ${orderId}
🏪 ${restaurant.name}
💰 ${money(order.total)}
💳 To‘lov: ${paymentName(paymentType)}`
      );

      await bot.sendMessage(
        ADMIN_CHAT_ID,
        `🛒 YANGI ORDER

🏷 ${orderId}
🏪 ${restaurant.name}
👤 ${order.customer}

${summary(session)}

💳 To‘lov: ${paymentName(paymentType)}
📞 ${session.phone}
📍 ${session.address}`,
        statusKeyboard(orderId, chatId)
      );

      resetSession(chatId);
      return;
    }
  });
}

module.exports = { registerBot };