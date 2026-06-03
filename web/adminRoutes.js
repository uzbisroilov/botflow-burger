const fs = require("fs-extra");
const path = require("path");

const ordersPath = path.join(__dirname, "../data/orders.json");

async function readOrders() {
  try {
    const exists = await fs.pathExists(ordersPath);

    if (!exists) {
      await fs.writeJson(ordersPath, []);
      return [];
    }

    return await fs.readJson(ordersPath);
  } catch (error) {
    console.log(error);
    return [];
  }
}

function money(n) {
  return (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function getStatusColor(status = "") {
  if (status.includes("Qabul")) return "#2563eb";
  if (status.includes("Tayyor")) return "#f59e0b";
  if (status.includes("Yo‘lda")) return "#8b5cf6";
  if (status.includes("Yetkazildi")) return "#16a34a";
  if (status.includes("Bekor")) return "#ef4444";
  return "#111827";
}

function adminRoutes(app) {

  app.get("/admin", async (req, res) => {

    const orders = await readOrders();

    const totalRevenue = orders
      .filter(o => o.status && o.status.includes("Yetkazildi"))
      .reduce((sum, o) => sum + Number(o.total || 0), 0);

    const today = new Date().toISOString().slice(0, 10);

    const todayOrders = orders.filter(o =>
      (o.createdAt || "").startsWith(today)
    );

    const deliveredCount = orders.filter(o =>
      (o.status || "").includes("Yetkazildi")
    ).length;

    const activeCount = orders.filter(o =>
      !(o.status || "").includes("Yetkazildi") &&
      !(o.status || "").includes("Bekor")
    ).length;

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>BotFlow AI Admin</title>

<style>

*{
  box-sizing:border-box;
  margin:0;
  padding:0;
  font-family:Inter,Arial,sans-serif;
}

body{
  background:#f3f5f9;
  color:#111827;
  padding:18px;
}

.header{
  background:linear-gradient(135deg,#111827,#1e293b);
  color:white;
  padding:24px;
  border-radius:30px;
  margin-bottom:20px;
  box-shadow:0 15px 35px rgba(15,23,42,.18);
}

.title{
  font-size:32px;
  font-weight:900;
}

.subtitle{
  margin-top:8px;
  color:#cbd5e1;
  font-size:15px;
}

.stats{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:14px;
  margin-bottom:22px;
}

.stat{
  background:white;
  border-radius:24px;
  padding:18px;
  box-shadow:0 10px 24px rgba(15,23,42,.08);
}

.statTitle{
  color:#64748b;
  font-size:14px;
  font-weight:700;
}

.statValue{
  margin-top:10px;
  font-size:28px;
  font-weight:900;
}

.ordersTitle{
  font-size:24px;
  font-weight:900;
  margin-bottom:16px;
}

.orders{
  display:flex;
  flex-direction:column;
  gap:18px;
}

.card{
  background:white;
  border-radius:28px;
  padding:18px;
  box-shadow:0 10px 28px rgba(15,23,42,.08);
}

.top{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:12px;
}

.orderId{
  font-size:20px;
  font-weight:900;
}

.restaurant{
  margin-top:4px;
  color:#64748b;
  font-weight:700;
}

.status{
  padding:8px 14px;
  border-radius:999px;
  color:white;
  font-size:13px;
  font-weight:900;
}

.info{
  margin-top:16px;
  display:grid;
  gap:10px;
}

.infoItem{
  background:#f8fafc;
  border-radius:18px;
  padding:12px;
}

.label{
  color:#64748b;
  font-size:13px;
  font-weight:700;
}

.value{
  margin-top:4px;
  font-size:15px;
  font-weight:800;
  word-break:break-word;
}

.items{
  margin-top:14px;
  background:#f8fafc;
  border-radius:20px;
  padding:14px;
}

.itemsTitle{
  font-weight:900;
  margin-bottom:10px;
}

.item{
  display:flex;
  justify-content:space-between;
  margin-bottom:8px;
  font-size:14px;
}

.total{
  margin-top:12px;
  padding-top:12px;
  border-top:1px solid #e5e7eb;
  display:flex;
  justify-content:space-between;
  font-size:18px;
  font-weight:900;
}

.actions{
  margin-top:18px;
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
}

.btn{
  border:0;
  border-radius:16px;
  padding:14px;
  color:white;
  font-weight:900;
  cursor:pointer;
  font-size:14px;
}

.accept{background:#2563eb}
.cooking{background:#f59e0b}
.delivery{background:#8b5cf6}
.done{background:#16a34a}
.cancel{background:#ef4444}

.mapBtn{
  margin-top:14px;
  width:100%;
  border:0;
  border-radius:18px;
  padding:15px;
  background:#111827;
  color:white;
  font-weight:900;
  font-size:15px;
}

.empty{
  background:white;
  border-radius:24px;
  padding:40px;
  text-align:center;
  color:#64748b;
  font-weight:800;
}

.refresh{
  position:fixed;
  bottom:20px;
  right:20px;
  width:64px;
  height:64px;
  border-radius:50%;
  border:0;
  background:#2563eb;
  color:white;
  font-size:26px;
  font-weight:900;
  box-shadow:0 12px 26px rgba(37,99,235,.35);
  cursor:pointer;
}

</style>
</head>

<body>

<div class="header">
  <div class="title">🚀 BotFlow AI Admin</div>
  <div class="subtitle">
    Live restaurant dashboard & order tracking
  </div>
</div>

<div class="stats">

  <div class="stat">
    <div class="statTitle">💰 Umumiy revenue</div>
    <div class="statValue">${money(totalRevenue)} so‘m</div>
  </div>

  <div class="stat">
    <div class="statTitle">📦 Bugungi orderlar</div>
    <div class="statValue">${todayOrders.length}</div>
  </div>

  <div class="stat">
    <div class="statTitle">🚗 Aktiv orderlar</div>
    <div class="statValue">${activeCount}</div>
  </div>

  <div class="stat">
    <div class="statTitle">🎉 Yetkazilgan</div>
    <div class="statValue">${deliveredCount}</div>
  </div>

</div>

<div class="ordersTitle">
  🛒 So‘nggi orderlar
</div>

<div class="orders">

${orders.length === 0 ? `
  <div class="empty">
    Hozircha orderlar yo‘q
  </div>
` : orders.reverse().map(order => `

<div class="card">

  <div class="top">

    <div>
      <div class="orderId">${order.orderId}</div>
      <div class="restaurant">${order.restaurant}</div>
    </div>

    <div 
      class="status"
      style="background:${getStatusColor(order.status)}"
    >
      ${order.status}
    </div>

  </div>

  <div class="info">

    <div class="infoItem">
      <div class="label">👤 Mijoz</div>
      <div class="value">${order.customer || "-"}</div>
    </div>

    <div class="infoItem">
      <div class="label">📞 Telefon</div>
      <div class="value">${order.phone || "-"}</div>
    </div>

    <div class="infoItem">
      <div class="label">📍 Manzil</div>
      <div class="value">${order.address || "-"}</div>
    </div>

    <div class="infoItem">
      <div class="label">💳 To‘lov</div>
      <div class="value">${order.paymentName || "-"}</div>
    </div>

  </div>

  <div class="items">

    <div class="itemsTitle">
      🍔 Mahsulotlar
    </div>

    ${(order.items || []).map(item => `
      <div class="item">
        <span>${item.name}</span>
        <span>${money(item.price)} so‘m</span>
      </div>
    `).join("")}

    <div class="total">
      <span>Jami</span>
      <span>${money(order.total)} so‘m</span>
    </div>

  </div>

  ${order.location ? `
    <a
      href="https://maps.google.com/?q=${order.location.latitude},${order.location.longitude}"
      target="_blank"
    >
      <button class="mapBtn">
        🗺 Google Maps ochish
      </button>
    </a>
  ` : ""}

  <div class="actions">

    <button class="btn accept">✅ Qabul</button>

    <button class="btn cooking">👨‍🍳 Tayyorlanmoqda</button>

    <button class="btn delivery">🚗 Yo‘lda</button>

    <button class="btn done">🎉 Yetkazildi</button>

  </div>

  <div class="actions">
    <button class="btn cancel">❌ Bekor qilish</button>
  </div>

</div>

`).join("")}

</div>

<button class="refresh" onclick="location.reload()">
↻
</button>

</body>
</html>
`;

    res.send(html);

  });

}

module.exports = { adminRoutes };