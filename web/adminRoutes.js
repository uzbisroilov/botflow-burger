const { getOrders, updateOrderStatus } = require("../services/orderService");
const { restaurants } = require("../appconfig/restaurants");

function money(n) {
  return (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " so‘m";
}

function isClosed(status) {
  return status === "🎉 Yetkazildi" || status === "❌ Bekor qilindi";
}

function paymentLabel(order) {
  if (order.paymentName) return order.paymentName;
  if (order.paymentType === "click") return "💳 Click";
  if (order.paymentType === "payme") return "💳 Payme";
  if (order.paymentType === "cash") return "💵 Naqd";
  return "—";
}

function orderItemsText(order) {
  if (!order.items || order.items.length === 0) return "-";

  return order.items
    .map((item, i) => `${i + 1}. ${item.name} — ${money(item.price)}`)
    .join("<br>");
}

function button(orderId, status, label, color) {
  return `
    <form method="POST" action="/admin/status" style="display:inline">
      <input type="hidden" name="orderId" value="${orderId}" />
      <input type="hidden" name="status" value="${status}" />
      <button class="${color}">${label}</button>
    </form>
  `;
}

function actionButtons(order) {
  if (isClosed(order.status)) {
    return `<b style="color:#6b7280;">Yakunlangan</b>`;
  }

  return `
    ${button(order.orderId, "✅ Qabul qilindi", "Qabul", "green")}
    ${button(order.orderId, "👨‍🍳 Tayyorlanmoqda", "Tayyor", "orange")}
    ${button(order.orderId, "🚗 Yo‘lda", "Yo‘lda", "blue")}
    ${button(order.orderId, "🎉 Yetkazildi", "Yetkazildi", "purple")}
    ${button(order.orderId, "❌ Bekor qilindi", "Bekor", "red")}
  `;
}

function analytics(orders) {
  const revenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const delivered = orders.filter((o) => o.status === "🎉 Yetkazildi").length;
  const cancelled = orders.filter((o) => o.status === "❌ Bekor qilindi").length;
  const active = orders.filter((o) => !isClosed(o.status)).length;

  return { revenue, delivered, cancelled, active };
}

function restaurantLinksHtml() {
  const botUsername = "botflow_support_bot";

  return Object.values(restaurants)
    .map((r) => {
      const base = `https://t.me/${botUsername}?start=restaurant_${r.id}`;
      const table1 = `https://t.me/${botUsername}?start=restaurant_${r.id}_table_1`;
      const table2 = `https://t.me/${botUsername}?start=restaurant_${r.id}_table_2`;
      const table3 = `https://t.me/${botUsername}?start=restaurant_${r.id}_table_3`;

      return `
        <div class="qr-card">
          <h3>${r.name}</h3>
          <p><b>General menu:</b><br><a href="${base}" target="_blank">${base}</a></p>
          <p><b>Table 1:</b><br><a href="${table1}" target="_blank">${table1}</a></p>
          <p><b>Table 2:</b><br><a href="${table2}" target="_blank">${table2}</a></p>
          <p><b>Table 3:</b><br><a href="${table3}" target="_blank">${table3}</a></p>

          <p>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(table1)}" />
          </p>
          <small>QR sample: Table 1</small>
        </div>
      `;
    })
    .join("");
}

function adminRoutes(app, bot) {
  app.get("/admin", async (req, res) => {
    const orders = await getOrders();
    const a = analytics(orders);

    const rows = orders
      .slice()
      .reverse()
      .map((o) => {
        const date = o.createdAt ? new Date(o.createdAt).toLocaleString("ru-RU") : "-";

        return `
<tr>
  <td>${o.orderId}</td>
  <td>${o.restaurant}</td>
  <td>${o.table || "—"}</td>
  <td>${o.customer}</td>
  <td>${o.phone}</td>
  <td>${o.address}</td>
  <td>${orderItemsText(o)}</td>
  <td>${money(o.total)}</td>
  <td>${paymentLabel(o)}</td>
  <td><b>${o.status || "Yangi"}</b></td>
  <td>${date}</td>
  <td>${actionButtons(o)}</td>
</tr>
`;
      })
      .join("");

    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta http-equiv="refresh" content="20">
<title>BotFlow Admin</title>
<style>
body{
  font-family:Arial;
  background:#f4f6f8;
  padding:20px;
}
h1{
  font-size:34px;
  margin-bottom:8px;
}
.subtitle{
  color:#6b7280;
  margin-bottom:20px;
}
.cards{
  display:flex;
  gap:15px;
  margin-bottom:20px;
  flex-wrap:wrap;
}
.card{
  background:white;
  padding:16px;
  border-radius:16px;
  min-width:180px;
  box-shadow:0 3px 10px #0001;
}
.card b{
  font-size:22px;
}
.panel{
  background:white;
  padding:16px;
  border-radius:16px;
  margin-bottom:20px;
  box-shadow:0 3px 10px #0001;
}
.qr-grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
  gap:15px;
}
.qr-card{
  background:white;
  padding:16px;
  border-radius:16px;
  box-shadow:0 3px 10px #0001;
  word-break:break-all;
}
table{
  width:100%;
  border-collapse:collapse;
  background:white;
  border-radius:14px;
  overflow:hidden;
}
th,td{
  border-bottom:1px solid #eee;
  padding:10px;
  text-align:left;
  vertical-align:top;
}
th{
  background:#111827;
  color:white;
}
button{
  border:none;
  color:white;
  padding:6px 10px;
  border-radius:8px;
  cursor:pointer;
  margin:2px;
}
.green{background:#16a34a;}
.orange{background:#ea580c;}
.blue{background:#2563eb;}
.purple{background:#7c3aed;}
.red{background:#dc2626;}
.refresh{
  display:inline-block;
  background:#111827;
  color:white;
  padding:9px 13px;
  border-radius:10px;
  text-decoration:none;
  margin-bottom:15px;
}
</style>
</head>
<body>

<h1>🚀 BotFlow Admin Panel</h1>
<div class="subtitle">QR Menu + Table Order System</div>

<a class="refresh" href="/admin">🔄 Refresh</a>

<div class="cards">
  <div class="card">🛒 Orders<br><br><b>${orders.length}</b></div>
  <div class="card">🟡 Active<br><br><b>${a.active}</b></div>
  <div class="card">🎉 Delivered<br><br><b>${a.delivered}</b></div>
  <div class="card">❌ Cancelled<br><br><b>${a.cancelled}</b></div>
  <div class="card">💰 Revenue<br><br><b>${money(a.revenue)}</b></div>
</div>

<div class="panel">
  <h2>🔗 QR Menu Links</h2>
  <p>Bu QR linklarni stolga qo‘yish mumkin.</p>
  <div class="qr-grid">
    ${restaurantLinksHtml()}
  </div>
</div>

<table>
<thead>
<tr>
<th>ID</th>
<th>Restaurant</th>
<th>Table</th>
<th>Customer</th>
<th>Phone</th>
<th>Address</th>
<th>Items</th>
<th>Total</th>
<th>Payment</th>
<th>Status</th>
<th>Date</th>
<th>Actions</th>
</tr>
</thead>
<tbody>
${rows}
</tbody>
</table>

</body>
</html>
`);
  });

  app.post("/admin/status", async (req, res) => {
    const { orderId, status } = req.body;

    const order = await updateOrderStatus(orderId, status);

    if (order && order.chatId) {
      await bot.sendMessage(order.chatId, `📌 Buyurtma holati:\n\n${order.status}`);
    }

    res.redirect("/admin");
  });
}

module.exports = { adminRoutes };