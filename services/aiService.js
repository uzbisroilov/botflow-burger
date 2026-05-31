let openai = null;

if (process.env.OPENAI_API_KEY) {
  try {
    const OpenAI = require("openai");

    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log("🤖 OpenAI ulandi");
  } catch (error) {
    console.log("❌ OpenAI init error:", error.message);
  }
} else {
  console.log("⚠️ OPENAI_API_KEY topilmadi");
}

function money(n) {
  return (
    (n || 0)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " so‘m"
  );
}

async function aiWaiterReply(text, restaurant, restaurants) {
  if (!process.env.OPENAI_API_KEY || !openai) {
    return "Buyurtma berish uchun 📋 Menu ni bosing yoki 🏪 Restoran tanlang.";
  }

  const menuInfo = restaurant
    ? Object.values(restaurant.menu)
        .map((i) => `${i.name} - ${money(i.price)}`)
        .join("\n")
    : Object.values(restaurants)
        .map((r) => r.name)
        .join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: `
Sen BotFlow AI restoran operatorisan.
O‘zbek tilida qisqa, muloyim va sotuvchi uslubda javob ber.
Mijozga menyu bo‘yicha tavsiya ber.
Buyurtma qilish uchun "📋 Menu" tugmasini bosishini ayt.
Juda uzun yozma.

Menyu:
${menuInfo}
`,
      },
      {
        role: "user",
        content: text,
      },
    ],
  });

  return completion.choices[0].message.content || "📋 Menu ni bosing.";
}

module.exports = {
  aiWaiterReply,
};