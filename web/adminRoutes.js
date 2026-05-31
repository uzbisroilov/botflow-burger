const {
  getOrders,
  updateOrderStatus,
} = require("../services/orderService");

function money(n) {
  return (
    (n || 0)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " so‘m"
  );
}

function isClosed(status) {
  return status === "🎉 Yetkazildi" || status === "❌ Bekor qilindi";
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

function paymentLabel(order) {
  if (order.paymentName) return order.paymentName;
  if (order.paymentType === "click") return "💳 Click";
  if (order.paymentType === "payme") return "💳 Payme";
  if (order.paymentType === "cash") return "💵 Naqd";
  return "—";
}

function analytics(orders) {
  const revenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);

  const delivered = orders.filter((o) => o.status === "🎉 Yetkazildi").length;
  const cancelled = orders.filter((o) => o.status === "❌ Bekor qilindi").length;
  const active = orders.filter((o) => !isClosed(o.status)).length;

  const today = new Date().toISOString().slice(0, 10);

  const todayOrders = orders.filter((o) => {
    return (o.createdAt || "").slice(0, 10) === today;
  });

  const todayRevenue = todayOrders.reduce((sum, order) => {
    return sum + (order.total || 0);
  }, 0);

  const productStats = {};
  const restaurantStats = {};
  const paymentStats = {};

  orders.forEach((order) => {
    restaurantStats[order.restaurant] =
      (restaurantStats[order.restaurant] || 0) + 1;

    paymentStats[paymentLabel(order)] =
      (paymentStats[paymentLabel(order)] || 0) + 1;

    (order.items || []).forEach((item) => {
      productStats[item.name] = (productStats[item.name] || 0) + 1;
    });
  });

  const topProduct =
    Object.entries(productStats).sort((a, b) => b[1] - a[1])[0] || ["—", 0];

  const topRestaurant =
    Object.entries(restaurantStats).sort((a, b) => b[1] - a[1])[0] || ["—", 0];

  const paymentList = Object.entries(paymentStats)
    .map(([name, count]) => `<li>${name}: <b>${count}</b></li>`)
    .join("");

  return {
    revenue,
    delivered,
    cancelled,
    active,
    todayRevenue,
    todayOrders: todayOrders.length,
    topProduct,
    topRestaurant,
    paymentList,
  };
}

function adminRoutes(app, bot) {
  app.get("/admin", async (req, res) => {
    const orders = await getOrders();
    const a = analytics(orders);

    const rows = orders
      .slice()
      .reverse()
      .map((o) => {
        const date = o.createdAt
          ? new Date(o.createdAt).toLocaleString("ru-RU")
          : "-";

        return `
<tr>
  <td>${o.orderId}</td>
  <td>${o.restaurant}</td>
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
.grid{
  display:grid;
  grid-template-columns:1fr 1fr 1fr;
  gap:15px;
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
<div class="subtitle">Professional Restaurant SaaS Dashboard</div>

<a class="refresh" href="/admin">🔄 Refresh</a>

<div class="cards">
  <div class="card">🛒 Orders<br><br><b>${orders.length}</b></div>
  <div class="card">🟡 Active<br><br><b>${a.active}</b></div>
  <div class="card">🎉 Delivered<br><br><b>${a.delivered}</b></div>
  <div class="card">❌ Cancelled<br><br><b>${a.cancelled}</b></div>
  <div class="card">💰 Revenue<br><br><b>${money(a.revenue)}</b></div>
  <div class="card">📅 Today Revenue<br><br><b>${money(a.todayRevenue)}</b></div>
</div>

<div class="grid">
  <div class="panel">
    <h3>🏆 Top mahsulot</h3>
    <p>${a.topProduct[0]} — <b>${a.topProduct[1]}</b> ta</p>
  </div>

  <div class="panel">
    <h3>🏪 Top restoran</h3>
    <p>${a.topRestaurant[0]} — <b>${a.topRestaurant[1]}</b> order</p>
  </div>

  <div class="panel">
    <h3>💳 Payment statistics</h3>
    <ul>${a.paymentList || "<li>Ma’lumot yo‘q</li>"}</ul>
  </div>
</div>

<table>
<thead>
<tr>
<th>ID</th>
<th>Restaurant</th>
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
      await bot.sendMessage(
        order.chatId,
        `📌 Buyurtma holati:\n\n${order.status}`
      );
    }

    res.redirect("/admin");
  });
}

module.exports = { adminRoutes };