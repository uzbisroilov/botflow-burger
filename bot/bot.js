const { saveOrder, updateOrderStatus, STATUSES } = require("../services/orderService");
const { createPaymentLink } = require("../services/paymentService");
const { getMenus } = require("../services/menuService");

const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const APP_URL = process.env.APP_URL || "https://botflow-burger-production.up.railway.app";

const sessions = {};
let restaurants = {};

async function loadMenus() {
  try {
    restaurants = await getMenus();
  } catch (error) {
    console.log("Menu load error:", error.message);
    restaurants = {};
  }
}

function money(n) {
  return (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " so‘m";
}

function getSession(chatId) {
  if (!sessions[chatId]) {
    sessions[chatId] = {
      restaurantId: null,
      items: [],
      phone: "",
      address: "",
      location: null,
      paymentType: "cash",
      step: "idle",
    };
  }

  return sessions[chatId];
}

function resetSession(chatId) {
  sessions[chatId] = {
    restaurantId: null,
    items: [],
    phone: "",
    address: "",
    location: null,
    paymentType: "cash",
    step: "idle",
  };
}

function isAdminGroup(chatId) {
  return ADMIN_CHAT_ID && chatId.toString() === ADMIN_CHAT_ID.toString();
}

function mainKeyboard() {
  return {
    reply_markup: {
      keyboard: [[{ text: "📋 Menu", web_app: { url: `${APP_URL}/menu` } }], ["❌ Bekor qilish"]],
      resize_keyboard: true,
    },
  };
}

function paymentName(type) {
  if (type === "click") return "💳 Click";
  if (type === "payme") return "💳 Payme";
  return "💵 Naqd";
}

function getRestaurant(session) {
  if (!session.restaurantId) return null;
  return restaurants[session.restaurantId] || null;
}

function total(session) {
  return session.items.reduce((sum, item) => sum + Number(item.price || 0), 0);
}

function summary(session) {
  if (!session.items || !session.items.length) return "🛒 Savat bo‘sh.";

  let text = "🧾 Buyurtma:\n\n";

  session.items.forEach((item, i) => {
    text += `${i + 1}. ${item.name} — ${money(item.price)}\n`;
  });

  text += `\n💰 Jami: ${money(total(session))}`;
  return text;
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

function clientStatusMessage(action, orderId) {
  if (action === "accepted") {
    return `✅ Buyurtmangiz qabul qilindi

🏷 ${orderId}
👨‍🍳 Oshxona buyurtmani tayyorlashni boshlaydi.`;
  }

  if (action === "cooking") {
    return `👨‍🍳 Buyurtmangiz tayyorlanmoqda

🏷 ${orderId}
⏱ Taxminiy vaqt: 20–30 daqiqa`;
  }

  if (action === "delivery") {
    return `🚗 Buyurtmangiz yo‘lga chiqdi

🏷 ${orderId}
📍 Kuryer manzilingizga yetib bormoqda.`;
  }

  if (action === "delivered") {
    return `🎉 Buyurtmangiz yetkazildi

🏷 ${orderId}
Yoqimli ishtaha! BotFlow AI xizmatidan foydalanganingiz uchun rahmat.`;
  }

  if (action === "cancelled") {
    return `❌ Buyurtmangiz bekor qilindi

🏷 ${orderId}
Qo‘shimcha ma’lumot uchun operator bilan bog‘laning.`;
  }

  return `📌 Buyurtmangiz holati yangilandi

🏷 ${orderId}`;
}

function adminStatusText(action) {
  if (action === "accepted") return "✅ Qabul qilindi";
  if (action === "cooking") return "👨‍🍳 Tayyorlanmoqda";
  if (action === "delivery") return "🚗 Yo‘lda";
  if (action === "delivered") return "🎉 Yetkazildi";
  if (action === "cancelled") return "❌ Bekor qilindi";
  return "📌 Status yangilandi";
}

async function createOrder(bot, chatId, fromUser = null) {
  await loadMenus();

  const session = getSession(chatId);
  const restaurant = getRestaurant(session);

  if (!restaurant || !session.items.length) {
    return bot.sendMessage(chatId, "❌ Buyurtma topilmadi.", mainKeyboard());
  }

  const orderId = "ORDER-" + Date.now().toString().slice(-6);

  const order = {
    orderId,
    restaurant: restaurant.name,
    restaurantId: restaurant.id,
    customer: fromUser?.first_name || "Client",
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

    return bot.sendMessage(
      chatId,
      `🚀 BotFlow AI

Buyurtma berish uchun pastdagi 📋 Menu tugmasini bosing.`,
      mainKeyboard()
    );
  });

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;

    if (isAdminGroup(chatId)) return;

    await loadMenus();

    if (msg.web_app_data && msg.web_app_data.data) {
      try {
        const data = JSON.parse(msg.web_app_data.data);

        if (data.type === "web_order_full") {
          const session = getSession(chatId);

          session.restaurantId = data.restaurantId;
          session.items = data.items || [];
          session.phone = data.phone || "";
          session.address = data.address || "Manzil kiritilmagan";
          session.paymentType = data.paymentType || "cash";
          session.location = data.location || null;

          return createOrder(bot, chatId, msg.from);
        }
      } catch (error) {
        console.log("WebApp data error:", error.message);
        return bot.sendMessage(chatId, "❌ Web menu ma’lumoti xato keldi.", mainKeyboard());
      }
    }

    const text = (msg.text || "").toLowerCase();

    if (!text || text.startsWith("/")) return;

    if (text.includes("bekor")) {
      resetSession(chatId);
      return bot.sendMessage(chatId, "❌ Bekor qilindi.", mainKeyboard());
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

      const statusText = adminStatusText(action);
      const clientText = clientStatusMessage(action, orderId);

      await updateOrderStatus(orderId, statusText);

      await bot.sendMessage(customerChatId, clientText, mainKeyboard());

      await bot.sendMessage(
        chatId,
        `✅ Admin status yangilandi

🏷 ${orderId}
📌 ${statusText}`
      );

      return;
    }
  });
}

module.exports = { registerBot };