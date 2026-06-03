const fs = require("fs-extra");
const path = require("path");

const ordersPath = path.join(__dirname, "../data/orders.json");

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
  return "📌 Status yangilandi";
}

function clientMessage(action, orderId) {
  if (action === "accepted") {
    return `✅ Buyurtmangiz qabul qilindi\n\n🏷 ${orderId}\n👨‍🍳 Oshxona buyurtmani tayyorlashni boshlaydi.`;
  }

  if (action === "cooking") {
    return `👨‍🍳 Buyurtmangiz tayyorlanmoqda\n\n🏷 ${orderId}\n⏱ Taxminiy vaqt: 20–30 daqiqa`;
  }

  if (action === "delivery") {
    return `🚗 Buyurtmangiz yo‘lga chiqdi\n\n🏷 ${orderId}\n📍 Kuryer manzilingizga yetib bormoqda.`;
  }

  if (action === "delivered") {
    return `🎉 Buyurtmangiz yetkazildi\n\n🏷 ${orderId}\nYoqimli ishtaha!`;
  }

  if (action === "cancelled") {
    return `❌ Buyurtmangiz bekor qilindi\n\n🏷 ${orderId}`;
  }

  return `📌 Buyurtmangiz holati yangilandi\n\n🏷 ${orderId}`;
}

function statusColor(status = "") {
  if (status.includes("Qabul")) return "#2563eb";
  if (status.includes("Tayyor")) return "#f59e0b";
  if (status.includes("Yo‘lda")) return "#8b5cf6";
  if (status.includes("Yetkazildi")) return "#16a34a";
  if (status.includes("Bekor")) return "#ef4444";
  return "#111827";
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

      order.status = statusLabel(action);
      order.updatedAt = new Date().toISOString();

      await writeOrders(orders);

      if (bot && order.chatId) {
        await bot.sendMessage(order.chatId, clientMessage(action, orderId));
      }

      return res.json({
        ok: true,
        status: order.status,
      });
    } catch (error) {
      console.log("Status update error:", error.message);
      return res.status(500).json({ ok: false, message: error.message });
    }
  });

  app.get("/admin", async (req, res) => {
    const orders = await readOrders();

    const totalRevenue = orders
      .filter((o) => (o.status || "").includes("Yetkazildi"))
      .reduce((sum, o) => sum + Number(o.total || 0), 0);

    const today = new Date().toISOString().slice(0, 10);

    const todayOrders = orders.filter((o) => (o.createdAt || "").startsWith(today));

    const activeCount = orders.filter(
      (o) =>
        !(o.status || "").includes("Yetkazildi") &&
        !(o.status || "").includes("Bekor")
    ).length;

    const deliveredCount = orders.filter((o) =>
      (o.status || "").includes("Yetkazildi")
    ).length;

    const cards = [...orders]
      .reverse()
      .map((order) => {
        const loc =
          order.location && order.location.latitude && order.location.longitude
            ? `https://maps.google.com/?q=${order.location.latitude},${order.location.longitude}`
            : "";

        return `
          <div class="card" id="card-${order.orderId}">
            <div class="cardTop">
              <div>
                <div class="orderId">${order.orderId}</div>
                <div class="restaurant">${order.restaurant || "-"}</div>
              </div>

              <div class="status" id="status-${order.orderId}" style="background:${statusColor(order.status)}">
                ${order.status || "🆕 Yangi"}
              </div>
            </div>

            <div class="infoGrid">
              <div class="info">
                <span>👤 Mijoz</span>
                <b>${order.customer || "-"}</b>
              </div>

              <div class="info">
                <span>📞 Telefon</span>
                <b>${order.phone || "-"}</b>
              </div>

              <div class="info">
                <span>📍 Manzil</span>
                <b>${order.address || "-"}</b>
              </div>

              <div class="info">
                <span>💳 To‘lov</span>
                <b>${order.paymentName || "-"}</b>
              </div>
            </div>

            <div class="items">
              <div class="itemsTitle">🍔 Mahsulotlar</div>

              ${(order.items || [])
                .map(
                  (item) => `
                    <div class="item">
                      <span>${item.name}</span>
                      <b>${money(item.price)} so‘m</b>
                    </div>
                  `
                )
                .join("")}

              <div class="total">
                <span>Jami</span>
                <b>${money(order.total)} so‘m</b>
              </div>
            </div>

            ${
              loc
                ? `
                  <a href="${loc}" target="_blank">
                    <button class="mapBtn">🗺 Google Maps ochish</button>
                  </a>
                `
                : ""
            }

            <div class="actions">
              <button class="btn accept" onclick="setStatus('${order.orderId}','accepted')">✅ Qabul</button>
              <button class="btn cooking" onclick="setStatus('${order.orderId}','cooking')">👨‍🍳 Tayyorlanmoqda</button>
              <button class="btn delivery" onclick="setStatus('${order.orderId}','delivery')">🚗 Yo‘lda</button>
              <button class="btn done" onclick="setStatus('${order.orderId}','delivered')">🎉 Yetkazildi</button>
              <button class="btn cancel" onclick="setStatus('${order.orderId}','cancelled')">❌ Bekor qilish</button>
            </div>
          </div>
        `;
      })
      .join("");

    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>BotFlow AI Admin</title>

<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:Inter,Arial,sans-serif}
body{background:#f4f6fb;color:#111827;padding:18px}
.header{background:linear-gradient(135deg,#111827,#1e293b);color:white;padding:26px;border-radius:30px;margin-bottom:20px;box-shadow:0 16px 36px rgba(15,23,42,.18)}
.title{font-size:32px;font-weight:900}
.subtitle{margin-top:8px;color:#cbd5e1;font-weight:600}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
.stat{background:white;border-radius:24px;padding:18px;box-shadow:0 10px 26px rgba(15,23,42,.08)}
.stat span{color:#64748b;font-weight:800;font-size:14px}
.stat b{display:block;margin-top:10px;font-size:26px}
.ordersTitle{font-size:25px;font-weight:900;margin-bottom:16px}
.orders{display:flex;flex-direction:column;gap:18px}
.card{background:white;border-radius:28px;padding:18px;box-shadow:0 12px 30px rgba(15,23,42,.08)}
.cardTop{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.orderId{font-size:21px;font-weight:900}
.restaurant{margin-top:4px;color:#64748b;font-weight:800}
.status{color:white;padding:9px 14px;border-radius:999px;font-size:13px;font-weight:900;white-space:nowrap}
.infoGrid{margin-top:16px;display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.info{background:#f8fafc;border-radius:18px;padding:12px}
.info span{display:block;color:#64748b;font-size:13px;font-weight:800}
.info b{display:block;margin-top:5px;font-size:15px;word-break:break-word}
.items{margin-top:14px;background:#f8fafc;border-radius:22px;padding:14px}
.itemsTitle{font-weight:900;margin-bottom:10px}
.item{display:flex;justify-content:space-between;gap:12px;margin-bottom:8px}
.total{margin-top:12px;padding-top:12px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:18px;font-weight:900}
.actions{margin-top:16px;display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.btn{border:0;border-radius:16px;padding:14px;color:white;font-weight:900;cursor:pointer;font-size:14px}
.accept{background:#2563eb}
.cooking{background:#f59e0b}
.delivery{background:#8b5cf6}
.done{background:#16a34a}
.cancel{background:#ef4444}
.mapBtn{margin-top:14px;width:100%;border:0;border-radius:18px;padding:15px;background:#111827;color:white;font-weight:900;font-size:15px;cursor:pointer}
.empty{background:white;border-radius:24px;padding:40px;text-align:center;color:#64748b;font-weight:900}
.refresh{position:fixed;right:20px;bottom:20px;width:64px;height:64px;border:0;border-radius:50%;background:#2563eb;color:white;font-size:26px;font-weight:900;box-shadow:0 12px 28px rgba(37,99,235,.35);cursor:pointer}
.toast{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);background:#111827;color:white;padding:14px 18px;border-radius:999px;font-weight:900;display:none;z-index:99}
@media(max-width:900px){
  .stats{grid-template-columns:1fr 1fr}
  .infoGrid{grid-template-columns:1fr 1fr}
  .actions{grid-template-columns:1fr 1fr}
}
</style>
</head>

<body>
<div class="header">
  <div class="title">🚀 BotFlow AI Admin</div>
  <div class="subtitle">Live order dashboard & tracking</div>
</div>

<div class="stats">
  <div class="stat"><span>💰 Revenue</span><b>${money(totalRevenue)} so‘m</b></div>
  <div class="stat"><span>📦 Bugungi orderlar</span><b>${todayOrders.length}</b></div>
  <div class="stat"><span>🚗 Aktiv orderlar</span><b>${activeCount}</b></div>
  <div class="stat"><span>🎉 Yetkazilgan</span><b>${deliveredCount}</b></div>
</div>

<div class="ordersTitle">🛒 So‘nggi orderlar</div>

<div class="orders">
  ${orders.length ? cards : `<div class="empty">Hozircha orderlar yo‘q</div>`}
</div>

<div class="toast" id="toast">Status yangilandi</div>

<button class="refresh" onclick="location.reload()">↻</button>

<script>
function color(status){
  if(status.includes("Qabul")) return "#2563eb";
  if(status.includes("Tayyor")) return "#f59e0b";
  if(status.includes("Yo‘lda")) return "#8b5cf6";
  if(status.includes("Yetkazildi")) return "#16a34a";
  if(status.includes("Bekor")) return "#ef4444";
  return "#111827";
}

function showToast(text){
  const t = document.getElementById("toast");
  t.innerText = text;
  t.style.display = "block";
  setTimeout(() => {
    t.style.display = "none";
  }, 1800);
}

async function setStatus(orderId, action){
  try{
    const res = await fetch("/admin/order/" + orderId + "/status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action })
    });

    const data = await res.json();

    if(!data.ok){
      showToast("Xato: " + (data.message || "status yangilanmadi"));
      return;
    }

    const badge = document.getElementById("status-" + orderId);
    badge.innerText = data.status;
    badge.style.background = color(data.status);

    showToast("✅ Status yangilandi va clientga yuborildi");
  }catch(e){
    showToast("Server xatosi");
  }
}
</script>
</body>
</html>
    `);
  });
}

module.exports = { adminRoutes };