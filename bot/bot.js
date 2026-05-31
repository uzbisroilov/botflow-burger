const { restaurants } = require("../appconfig/restaurants");

const {
  saveOrder,
  updateOrderStatus,
  STATUSES,
} = require("../services/orderService");

const {
  aiWaiterReply,
} = require("../services/aiService");

const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

const sessions = {};

function money(n) {
  return (
    (n || 0)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " so‘m"
  );
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

  return restaurants[session.restaurantId];
}

function total(session) {
  return session.items.reduce((sum, item) => {
    return sum + item.price;
  }, 0);
}

function summary(session) {
  if (session.items.length === 0) {
    return "🛒 Savat bo‘sh.";
  }

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
        [
          {
            text: restaurants.burger.name,
            callback_data: "restaurant_burger",
          },
        ],

        [
          {
            text: restaurants.sushi.name,
            callback_data: "restaurant_sushi",
          },
        ],

        [
          {
            text: restaurants.coffee.name,
            callback_data: "restaurant_coffee",
          },
        ],
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
    buttons.push([
      {
        text: item.name,
        callback_data: `food_${key}`,
      },
    ]);
  });

  buttons.push([
    {
      text: "🧾 Savat",
      callback_data: "cart",
    },
  ]);

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
          {
            text: "➕ Yana qo‘shish",
            callback_data: "more",
          },

          {
            text: "✅ Yakunlash",
            callback_data: "finish",
          },
        ],
      ],
    },
  };
}

function statusKeyboard(orderId, chatId) {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "✅ Qabul",
            callback_data: `status_accepted_${orderId}_${chatId}`,
          },
        ],

        [
          {
            text: "👨‍🍳 Tayyorlanmoqda",
            callback_data: `status_cooking_${orderId}_${chatId}`,
          },
        ],

        [
          {
            text: "🚗 Yo‘lda",
            callback_data: `status_delivery_${orderId}_${chatId}`,
          },
        ],

        [
          {
            text: "🎉 Yetkazildi",
            callback_data: `status_delivered_${orderId}_${chatId}`,
          },
        ],

        [
          {
            text: "❌ Bekor",
            callback_data: `status_cancelled_${orderId}_${chatId}`,
          },
        ],
      ],
    },
  };
}

function registerBot(bot) {
  bot.onText(/\/id/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      `🆔 Chat ID: ${msg.chat.id}`
    );
  });

  bot.onText(/\/start/, (msg) => {
    resetSession(msg.chat.id);

    bot.sendMessage(
      msg.chat.id,

      `🚀 BotFlow AI

1 bot ichida:
🍔 Burger
🍣 Sushi
☕ Coffee`,
      mainKeyboard()
    );

    bot.sendMessage(
      msg.chat.id,
      "🏪 Restoran tanlang:",
      restaurantKeyboard()
    );
  });

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;

    const rawText = msg.text || "";

    const text = rawText.toLowerCase();

    if (
      !text ||
      text.startsWith("/")
    ) {
      return;
    }

    const session = getSession(chatId);

    const restaurant = getRestaurant(session);

    if (text.includes("bekor")) {
      resetSession(chatId);

      return bot.sendMessage(
        chatId,
        "❌ Bekor qilindi.",
        mainKeyboard()
      );
    }

    if (text.includes("restoran")) {
      return bot.sendMessage(
        chatId,
        "🏪 Restoran tanlang:",
        restaurantKeyboard()
      );
    }

    if (text.includes("menu")) {
      if (!restaurant) {
        return bot.sendMessage(
          chatId,
          "Avval restoran tanlang.",
          restaurantKeyboard()
        );
      }

      return bot.sendMessage(
        chatId,
        menuText(restaurant),
        menuKeyboard(restaurant)
      );
    }

    if (text.includes("savat")) {
      return bot.sendMessage(
        chatId,
        summary(session),
        cartKeyboard()
      );
    }

    if (session.step === "phone") {
      session.phone = msg.text;

      session.step = "address";

      return bot.sendMessage(
        chatId,
        "📍 Manzil yuboring."
      );
    }

    if (session.step === "address") {
      session.address = msg.text;

      const orderId =
        "ORDER-" +
        Date.now()
          .toString()
          .slice(-6);

      const order = {
        orderId,

        restaurant: restaurant.name,

        customer:
          msg.from.first_name ||
          "Noma’lum",

        chatId,

        phone: session.phone,

        address: session.address,

        items: session.items,

        total: total(session),

        status: "🆕 Yangi",

        createdAt:
          new Date().toISOString(),
      };

      await saveOrder(order);

      await bot.sendMessage(
        chatId,

        `✅ Buyurtma qabul qilindi

🏷 ${orderId}
💰 ${money(order.total)}`
      );

      await bot.sendMessage(
        ADMIN_CHAT_ID,

        `🛒 YANGI ORDER

🏷 ${orderId}
🏪 ${restaurant.name}
👤 ${order.customer}

${summary(session)}

📞 ${session.phone}
📍 ${session.address}`,

        statusKeyboard(
          orderId,
          chatId
        )
      );

      resetSession(chatId);

      return;
    }

    try {
      const aiText =
        await aiWaiterReply(
          rawText,
          restaurant,
          restaurants
        );

      return bot.sendMessage(
        chatId,
        aiText
      );
    } catch (error) {
      console.log(error.message);

      return bot.sendMessage(
        chatId,
        "🤖 Tushunmadim."
      );
    }
  });

  bot.on(
    "callback_query",
    async (query) => {
      const chatId =
        query.message.chat.id;

      const data = query.data;

      const session =
        getSession(chatId);

      await bot.answerCallbackQuery(
        query.id
      );

      if (
        data.startsWith(
          "restaurant_"
        )
      ) {
        const restaurantId =
          data.replace(
            "restaurant_",
            ""
          );

        session.restaurantId =
          restaurantId;

        const restaurant =
          restaurants[restaurantId];

        return bot.sendMessage(
          chatId,
          menuText(restaurant),
          menuKeyboard(restaurant)
        );
      }

      if (
        data.startsWith("food_")
      ) {
        const restaurant =
          getRestaurant(session);

        const key = data.replace(
          "food_",
          ""
        );

        const item =
          restaurant.menu[key];

        session.items.push(item);

        return bot.sendMessage(
          chatId,

          `✅ ${item.name} qo‘shildi

${summary(session)}`,

          cartKeyboard()
        );
      }

      if (data === "more") {
        const restaurant =
          getRestaurant(session);

        return bot.sendMessage(
          chatId,
          menuText(restaurant),
          menuKeyboard(restaurant)
        );
      }

      if (data === "cart") {
        return bot.sendMessage(
          chatId,
          summary(session),
          cartKeyboard()
        );
      }

      if (data === "finish") {
        session.step = "phone";

        return bot.sendMessage(
          chatId,
          "📞 Telefon yuboring."
        );
      }

      if (
        data.startsWith(
          "status_"
        )
      ) {
        const parts =
          data.split("_");

        const action =
          parts[1];

        const orderId =
          parts[2];

        const customerChatId =
          parts[3];

        const statusText =
          STATUSES[action];

        await updateOrderStatus(
          orderId,
          statusText
        );

        await bot.sendMessage(
          customerChatId,

          `📌 Buyurtma holati:

${statusText}`
        );

        await bot.sendMessage(
          chatId,

          `✅ ${orderId}

${statusText}`
        );
      }
    }
  );
}

module.exports = {
  registerBot,
};