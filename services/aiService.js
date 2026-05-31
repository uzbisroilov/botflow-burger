let openai = null;

if (process.env.OPENAI_API_KEY) {
  try {
    const OpenAI = require("openai");

    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log("🤖 OpenAI ulandi");
  } catch (error) {
    console.log("❌ OpenAI error:", error.message);
  }
}

function money(n) {
  return (
    (n || 0)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " so‘m"
  );
}

async function aiWaiterReply(text, restaurant, restaurants) {
  if (!openai) {
    return "🤖 AI ulanmagan.";
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

Qisqa, sotuvchi va muloyim javob ber.

Mijozga menu bo‘yicha tavsiya qil.

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

  return completion.choices[0].message.content;
}

module.exports = {
  aiWaiterReply,
};