const fs = require("fs-extra");
const path = require("path");

const ordersPath = path.join(__dirname, "../data/orders.json");

const OWNER_KEYS = {
  burger: "burger123",
  sushi: "sushi123",
  coffee: "coffee123",
};

async function readOrders() {
  try {
    if (!(await fs.pathExists(ordersPath))) {
      await fs.ensureDir(path.dirname(ordersPath));
      await fs.writeJson(ordersPath, [], { spaces: 2 });
      return [];
    }

    const data = await fs.readJson(ordersPath);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.log("Read orders error:", error.message);
    return [];
  }
}

async function writeOrders(orders) {
  await fs.ensureDir(path.dirname(ordersPath));
  await fs.writeJson(ordersPath, orders, { spaces: 2 });
}

function money(n) {
  return Number(n || 0).toLocaleString("ru-RU");
}

function statusLabel(action) {
  if (action === "accepted") return "✅ Qabul qilindi";
  if (action === "cooking") return "👨‍🍳 Tayyorlanmoqda";
  if (action === "delivery") return "🚗 Yo‘lda";
  if (action === "delivered") return "🎉 Yetkazildi";
  if (action === "cancelled") return "❌ Bekor qilindi";
  return "📌 Status";
}

function clientMessage(action, orderId) {
  if (action === "accepted") return `✅ Buyurtmangiz qabul qilindi\n\n🏷 ${orderId}\n👨‍🍳 Tayyorlash boshlandi`;
  if (action === "cooking") return `👨‍🍳 Buyurtmangiz tayyorlanmoqda\n\n🏷 ${orderId}\n⏱ Tez orada tayyor bo‘ladi`;
  if (action === "delivery") return `🚗 Buyurtmangiz yo‘lda\n\n🏷 ${orderId}\n📍 Kuryer sizga yaqinlashmoqda`;
  if (action === "delivered") return `🎉 Buyurtma yetkazildi\n\n🏷 ${orderId}\nYoqimli ishtaha 😋`;
  if (action === "cancelled") return `❌ Buyurtma bekor qilindi\n\n🏷 ${orderId}`;
  return `📌 Status yangilandi`;
}

function statusColor(status = "") {
  if (status.includes("Qabul")) return "#2563eb";
  if (status.includes("Tayyor")) return "#f59e0b";
  if (status.includes("Yo‘lda")) return "#8b5cf6";
  if (status.includes("Yetkazildi")) return "#16a34a";
  if (status.includes("Bekor")) return "#ef4444";
  return "#111827";
}

function renderDashboard({ orders, title, subtitle, scopedRestaurantId = "" }) {
  const revenue = orders
    .filter((o) => (o.status || "").includes("Yetkazildi"))
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((o) => (o.createdAt || "").startsWith(today));

  const activeOrders = orders.filter(
    (o) =>
      !(o.status || "").includes("Yetkazildi") &&
      !(o.status || "").includes("Bekor")
  );

  const deliveredOrders = orders.filter((o) =>
    (o.status || "").includes("Yetkazildi")
  );

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>BotFlow AI Admin</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif}
body{background:#f3f5f9;padding:20px;color:#111827}
.header{background:linear-gradient(135deg,#111827,#1e293b);color:white;padding:28px;border-radius:30px;margin-bottom:24px}
.title{font-size:34px;font-weight:900}
.subtitle{margin-top:8px;color:#cbd5e1}
.nav{margin-top:18px;display:flex;gap:10px;flex-wrap:wrap}
.nav a{color:white;text-decoration:none;background:rgba(255,255,255,.12);padding:10px 14px;border-radius:999px;font-weight:900}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}
.stat{background:white;border-radius:24px;padding:18px;box-shadow:0 10px 26px rgba(15,23,42,.08)}
.statTitle{color:#64748b;font-size:14px;font-weight:700}
.statValue{margin-top:10px;font-size:28px;font-weight:900}
.ordersTitle{font-size:28px;font-weight:900;margin-bottom:18px}
.orders{display:flex;flex-direction:column;gap:18px}
.card{background:white;border-radius:28px;padding:18px;box-shadow:0 10px 26px rgba(15,23,42,.08)}
.top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.orderId{font-size:22px;font-weight:900}
.restaurant{margin-top:4px;color:#64748b;font-weight:700}
.status{color:white;padding:10px 14px;border-radius:999px;font-size:13px;font-weight:900}
.infoGrid{margin-top:18px;display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.info{background:#f8fafc;border-radius:18px;padding:14px}
.info span{color:#64748b;font-size:13px;font-weight:700}
.info b{display:block;margin-top:6px;word-break:break-word}
.items{margin-top:16px;background:#f8fafc;border-radius:20px;padding:14px}
.itemsTitle{font-weight:900;margin-bottom:10px}
.item{display:flex;justify-content:space-between;gap:12px;margin-bottom:8px}
.total{margin-top:12px;padding-top:12px;border-top:1px solid #dbe1e8;display:flex;justify-content:space-between;font-size:18px;font-weight:900}
.actions{margin-top:18px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
.btn{border:0;border-radius:18px;padding:16px;color:white;font-size:15px;font-weight:900;cursor:pointer}
.accept{background:#2563eb}.cooking{background:#f59e0b}.delivery{background:#8b5cf6}.done{background:#16a34a}
.cancel{background:#ef4444;grid-column:1/3}
.mapBtn{width:100%;margin-top:14px;border:0;border-radius:18px;padding:16px;background:#111827;color:white;font-weight:900}
.toast{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#111827;color:white;padding:14px 20px;border-radius:999px;display:none;font-weight:900}
.refresh{position:fixed;right:24px;bottom:24px;width:68px;height:68px;border-radius:50%;border:0;background:#2563eb;color:white;font-size:28px;font-weight:900;cursor:pointer}
.empty{background:white;border-radius:24px;padding:40px;text-align:center;color:#64748b;font-weight:900}
@media(max-width:900px){.stats{grid-template-columns:1fr 1fr}.infoGrid{grid-template-columns:1fr}}
</style>
</head>
<body>

<div class="header">
  <div class="title">${title}</div>
  <div class="subtitle">${subtitle}</div>
  <div class="nav">
    <a href="/admin">Super Admin</a>
    <a href="/admin/burger?key=burger123">Burger Owner</a>
    <a href="/admin/sushi?key=sushi123">Sushi Owner</a>
    <a href="/admin/coffee?key=coffee123">Coffee Owner</a>
  </div>
</div>

<div class="stats">
  <div class="stat"><div class="statTitle">💰 Revenue</div><div class="statValue">${money(revenue)} so‘m</div></div>
  <div class="stat"><div class="statTitle">📦 Bugungi order</div><div class="statValue">${todayOrders.length}</div></div>
  <div class="stat"><div class="statTitle">🚗 Aktiv order</div><div class="statValue">${activeOrders.length}</div></div>
  <div class="stat"><div class="statTitle">🎉 Yetkazilgan</div><div class="statValue">${deliveredOrders.length}</div></div>
</div>

<div class="ordersTitle">🛒 Buyurtmalar</div>

<div class="orders">
${
  orders.length
    ? [...orders].reverse().map((order) => {
        const mapLink = order.location
          ? `https://maps.google.com/?q=${order.location.latitude},${order.location.longitude}`
          : "";

        return `
<div class="card" id="card-${order.orderId}">
  <div class="top">
    <div>
      <div class="orderId">${order.orderId}</div>
      <div class="restaurant">${order.restaurant}</div>
    </div>
    <div class="status" id="status-${order.orderId}" style="background:${statusColor(order.status)}">
      ${order.status || "🆕 Yangi"}
    </div>
  </div>

  <div class="infoGrid">
    <div class="info"><span>👤 Mijoz</span><b>${order.customer || "-"}</b></div>
    <div class="info"><span>📞 Telefon</span><b>${order.phone || "-"}</b></div>
    <div class="info"><span>📍 Manzil</span><b>${order.address || "-"}</b></div>
    <div class="info"><span>💳 To‘lov</span><b>${order.paymentName || "-"}</b></div>
  </div>

  <div class="items">
    <div class="itemsTitle">🍔 Mahsulotlar</div>
    ${(order.items || []).map((item) => `
      <div class="item"><span>${item.name}</span><b>${money(item.price)} so‘m</b></div>
    `).join("")}
    <div class="total"><span>Jami</span><span>${money(order.total)} so‘m</span></div>
  </div>

  ${mapLink ? `<a href="${mapLink}" target="_blank"><button class="mapBtn">🗺 Google Maps ochish</button></a>` : ""}

  <div class="actions">
    <button class="btn accept" onclick="setStatus('${order.orderId}','accepted')">✅ Qabul</button>
    <button class="btn cooking" onclick="setStatus('${order.orderId}','cooking')">👨‍🍳 Tayyorlanmoqda</button>
    <button class="btn delivery" onclick="setStatus('${order.orderId}','delivery')">🚗 Yo‘lda</button>
    <button class="btn done" onclick="setStatus('${order.orderId}','delivered')">🎉 Yetkazildi</button>
    <button class="btn cancel" onclick="setStatus('${order.orderId}','cancelled')">❌ Bekor qilish</button>
  </div>
</div>`;
      }).join("")
    : `<div class="empty">Hozircha orderlar yo‘q</div>`
}
</div>

<div class="toast" id="toast">Status yangilandi</div>
<button class="refresh" onclick="location.reload()">↻</button>

<script>
const scopedRestaurantId = "${scopedRestaurantId}";

function color(status){
  if(status.includes("Qabul")) return "#2563eb";
  if(status.includes("Tayyor")) return "#f59e0b";
  if(status.includes("Yo‘lda")) return "#8b5cf6";
  if(status.includes("Yetkazildi")) return "#16a34a";
  if(status.includes("Bekor")) return "#ef4444";
  return "#111827";
}

function toast(text){
  const t = document.getElementById("toast");
  t.innerText = text;
  t.style.display = "block";
  setTimeout(()=>{t.style.display = "none";},2000);
}

async function setStatus(orderId, action){
  try{
    const response = await fetch("/admin/order/" + orderId + "/status", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ action })
    });

    const data = await response.json();

    if(!data.ok){
      toast("Xatolik");
      return;
    }

    if(data.deleted){
      const card = document.getElementById("card-" + orderId);
      if(card) card.remove();
      toast("❌ Buyurtma o‘chirildi");
      return;
    }

    const badge = document.getElementById("status-" + orderId);
    badge.innerText = data.status;
    badge.style.background = color(data.status);
    toast("✅ Status yangilandi");
  }catch(error){
    console.log(error);
    toast("Server xatosi");
  }
}
</script>

</body>
</html>`;
}

function adminRoutes(app, bot) {
  app.post("/admin/order/:orderId/status", async (req, res) => {
    try {
      const { orderId } = req.params;
      const { action } = req.body;

      const orders = await readOrders();
      const order = orders.find((o) => o.orderId === orderId);

      if (!order) {
        return res.status(404).json({ ok: false, message: "Order topilmadi" });
      }

      if (action === "cancelled") {
        const filteredOrders = orders.filter((o) => o.orderId !== orderId);
        await writeOrders(filteredOrders);

        if (bot && order.chatId) {
          await bot.sendMessage(order.chatId, clientMessage(action, orderId));
        }

        return res.json({ ok: true, deleted: true });
      }

      order.status = statusLabel(action);
      order.updatedAt = new Date().toISOString();

      await writeOrders(orders);

      if (bot && order.chatId) {
        await bot.sendMessage(order.chatId, clientMessage(action, orderId));
      }

      return res.json({ ok: true, status: order.status });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ ok: false, message: error.message });
    }
  });

  app.get("/admin", async (req, res) => {
    const orders = await readOrders();
    res.send(
      renderDashboard({
        orders,
        title: "🚀 BotFlow AI Super Admin",
        subtitle: "Barcha restoranlar buyurtmalari",
      })
    );
  });

  app.get("/admin/:restaurantId", async (req, res) => {
    const { restaurantId } = req.params;
    const { key } = req.query;

    if (!OWNER_KEYS[restaurantId]) {
      return res.status(404).send("Restaurant topilmadi");
    }

    if (key !== OWNER_KEYS[restaurantId]) {
      return res.status(403).send("Access denied. Noto‘g‘ri key.");
    }

    const orders = await readOrders();
    const filtered = orders.filter((o) => o.restaurantId === restaurantId);

    res.send(
      renderDashboard({
        orders: filtered,
        title: `🏪 ${restaurantId.toUpperCase()} Owner Panel`,
        subtitle: "Faqat shu restoran buyurtmalari",
        scopedRestaurantId: restaurantId,
      })
    );
  });
}

module.exports = { adminRoutes };