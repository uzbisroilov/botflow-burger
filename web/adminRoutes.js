const { getAnalytics } = require("../services/analyticsService");
const { getOrders, updateOrderStatus } = require("../services/orderService");
const { getMenus, updateMenuItem, deleteMenuItem } = require("../services/menuService");

const ADMIN_PASS = process.env.ADMIN_PASS || "12345";

function checkPass(req, res) {
  if (req.query.pass !== ADMIN_PASS) {
    res.send(`
      <h1>🔒 Access denied</h1>
      <p>Parol noto‘g‘ri.</p>
      <p>Masalan: /admin?pass=12345</p>
    `);
    return false;
  }
  return true;
}

function passQuery(req) {
  return `?pass=${req.query.pass || ""}`;
}

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

function button(orderId, status, label, color, pass) {
  return `
    <form method="POST" action="/admin/status?pass=${pass}" style="display:inline">
      <input type="hidden" name="orderId" value="${orderId}" />
      <input type="hidden" name="status" value="${status}" />
      <button class="${color}">${label}</button>
    </form>
  `;
}

function actionButtons(order, pass) {
  if (isClosed(order.status)) {
    return `<b style="color:#6b7280;">Yakunlangan</b>`;
  }

  return `
    ${button(order.orderId, "✅ Qabul qilindi", "Qabul", "green", pass)}
    ${button(order.orderId, "👨‍🍳 Tayyorlanmoqda", "Tayyor", "orange", pass)}
    ${button(order.orderId, "🚗 Yo‘lda", "Yo‘lda", "blue", pass)}
    ${button(order.orderId, "🎉 Yetkazildi", "Yetkazildi", "purple", pass)}
    ${button(order.orderId, "❌ Bekor qilindi", "Bekor", "red", pass)}
  `;
}

function analytics(orders) {
  const revenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const delivered = orders.filter((o) => o.status === "🎉 Yetkazildi").length;
  const cancelled = orders.filter((o) => o.status === "❌ Bekor qilindi").length;
  const active = orders.filter((o) => !isClosed(o.status)).length;

  return { revenue, delivered, cancelled, active };
}

function ordersRows(orders, pass, showRestaurant = true, showActions = true) {
  return orders
    .slice()
    .reverse()
    .map((o) => {
      const date = o.createdAt ? new Date(o.createdAt).toLocaleString("ru-RU") : "-";

      return `
<tr>
  <td>${o.orderId}</td>
  ${showRestaurant ? `<td>${o.restaurant}</td>` : ""}
  <td>${o.table || "—"}</td>
  <td>${o.customer || "—"}</td>
  <td>${o.phone || "—"}</td>
  <td>${o.address || "—"}</td>
  <td>${orderItemsText(o)}</td>
  <td>${money(o.total)}</td>
  <td>${paymentLabel(o)}</td>
  <td><b>${o.status || "🆕 Yangi"}</b></td>
  <td>${date}</td>
  ${showActions ? `<td>${actionButtons(o, pass)}</td>` : ""}
</tr>
`;
    })
    .join("");
}

function menuEditorHtml(restaurant, pass) {
  const rows = Object.entries(restaurant.menu || {})
    .map(([key, item]) => {
      return `
<tr>
  <td>${key}</td>
  <td>
    <form method="POST" action="/admin/${restaurant.id}/menu/update?pass=${pass}">
      <input type="hidden" name="itemKey" value="${key}" />
      <input name="name" value="${item.name}" />
  </td>
  <td>
      <input name="price" value="${item.price}" type="number" />
  </td>
  <td>
      <button class="green">Save</button>
    </form>
  </td>
  <td>
    <form method="POST" action="/admin/${restaurant.id}/menu/delete?pass=${pass}">
      <input type="hidden" name="itemKey" value="${key}" />
      <button class="red">Delete</button>
    </form>
  </td>
</tr>
`;
    })
    .join("");

  return `
<div class="panel">
  <h2>🍽 Menu Editor</h2>

  <form method="POST" action="/admin/${restaurant.id}/menu/update?pass=${pass}" class="menu-form">
    <input name="itemKey" placeholder="key: double_burger" required />
    <input name="name" placeholder="Nomi: 🍔 Double Burger" required />
    <input name="price" placeholder="Narxi" type="number" required />
    <button class="blue">Add</button>
  </form>

  <table>
    <thead>
      <tr>
        <th>Key</th>
        <th>Name</th>
        <th>Price</th>
        <th>Save</th>
        <th>Delete</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</div>
`;
}

function pageLayout(title, subtitle, bodyHtml) {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta http-equiv="refresh" content="20">
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<style>
body{font-family:Arial;background:#f4f6f8;padding:20px;}
h1{font-size:34px;margin-bottom:8px;}
.subtitle{color:#6b7280;margin-bottom:20px;}
.cards{display:flex;gap:15px;margin-bottom:20px;flex-wrap:wrap;}
.card{background:white;padding:16px;border-radius:16px;min-width:180px;box-shadow:0 3px 10px #0001;}
.card b{font-size:22px;}
.panel{background:white;padding:16px;border-radius:16px;margin-bottom:20px;box-shadow:0 3px 10px #0001;}
table{width:100%;border-collapse:collapse;background:white;border-radius:14px;overflow:hidden;margin-top:10px;}
th,td{border-bottom:1px solid #eee;padding:10px;text-align:left;vertical-align:top;}
th{background:#111827;color:white;}
button{border:none;color:white;padding:6px 10px;border-radius:8px;cursor:pointer;margin:2px;}
input{padding:8px;border:1px solid #ddd;border-radius:8px;margin:3px;}
.green{background:#16a34a;}
.orange{background:#ea580c;}
.blue{background:#2563eb;}
.purple{background:#7c3aed;}
.red{background:#dc2626;}
.refresh{display:inline-block;background:#111827;color:white;padding:9px 13px;border-radius:10px;text-decoration:none;margin-bottom:15px;}
.menu-form{display:flex;gap:8px;flex-wrap:wrap;}
a{color:#2563eb;}
</style>
</head>
<body>
<h1>${title}</h1>
<div class="subtitle">${subtitle}</div>
<a class="refresh" href="">🔄 Refresh</a>
${bodyHtml}
</body>
</html>
`;
}

function adminRoutes(app, bot) {
  app.get("/admin", async (req, res) => {
    if (!checkPass(req, res)) return;

    const pass = req.query.pass;
    const orders = await getOrders();
    const a = analytics(orders);
    const advanced = getAnalytics(orders);

    const body = `
<div class="panel">
  <h2>📊 Advanced Analytics</h2>

  <div class="cards">
    <div class="card">📈 Today Revenue<br><br><b>${money(advanced.todayRevenue)}</b></div>
    <div class="card">🛒 Today Orders<br><br><b>${advanced.todayOrders}</b></div>
    <div class="card">💰 Avg Check<br><br><b>${money(advanced.averageCheck)}</b></div>
    <div class="card">🔥 Today Avg<br><br><b>${money(advanced.todayAverageCheck)}</b></div>
  </div>

  <h3>🏆 TOP 5 Products</h3>
  <ol>
    ${
      advanced.topProducts.length
        ? advanced.topProducts
            .map(
              (p) =>
                `<li><b>${p.name}</b> — ${p.count} ta | ${money(p.revenue)}</li>`
            )
            .join("")
        : "<li>Hali ma’lumot yo‘q</li>"
    }
  </ol>
</div>
    <div class="cards">
  <div class="card">🛒 Orders<br><br><b>${orders.length}</b></div>
  <div class="card">🟡 Active<br><br><b>${a.active}</b></div>
  <div class="card">🎉 Delivered<br><br><b>${a.delivered}</b></div>
  <div class="card">❌ Cancelled<br><br><b>${a.cancelled}</b></div>
  <div class="card">💰 Revenue<br><br><b>${money(a.revenue)}</b></div>
</div>

<p>
  <a href="/kitchen?pass=${pass}">👨‍🍳 Kitchen Screen</a> |
  <a href="/menu">📱 Web App Menu</a> |
  <a href="/admin/burger?pass=${pass}">🍔 Burger panel</a> |
  <a href="/admin/sushi?pass=${pass}">🍣 Sushi panel</a> |
  <a href="/admin/coffee?pass=${pass}">☕ Coffee panel</a>
</p>

<table>
<thead>
<tr>
<th>ID</th><th>Restaurant</th><th>Table</th><th>Customer</th><th>Phone</th>
<th>Address</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th>Actions</th>
</tr>
</thead>
<tbody>${ordersRows(orders, pass, true, true)}</tbody>
</table>
`;

    res.send(pageLayout("🚀 BotFlow Admin Panel", "Orders + Analytics + Kitchen", body));
  });

  app.get("/admin/:restaurantId", async (req, res) => {
    if (!checkPass(req, res)) return;

    const pass = req.query.pass;
    const restaurantId = req.params.restaurantId;
    const menus = await getMenus();
    const restaurant = menus[restaurantId];

    if (!restaurant) {
      return res.send(pageLayout("Restaurant not found", "Bunday restoran topilmadi", ""));
    }

    const allOrders = await getOrders();
    const orders = allOrders.filter((o) => o.restaurantId === restaurantId);
    const a = analytics(orders);

    const body = `
<div class="cards">
  <div class="card">🛒 Orders<br><br><b>${orders.length}</b></div>
  <div class="card">🟡 Active<br><br><b>${a.active}</b></div>
  <div class="card">🎉 Delivered<br><br><b>${a.delivered}</b></div>
  <div class="card">❌ Cancelled<br><br><b>${a.cancelled}</b></div>
  <div class="card">💰 Revenue<br><br><b>${money(a.revenue)}</b></div>
</div>

${menuEditorHtml(restaurant, pass)}

<table>
<thead>
<tr>
<th>ID</th><th>Table</th><th>Customer</th><th>Phone</th><th>Address</th>
<th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th>Actions</th>
</tr>
</thead>
<tbody>${ordersRows(orders, pass, false, true)}</tbody>
</table>
`;

    res.send(pageLayout(`${restaurant.name} Owner Panel`, "Owner dashboard + menu editor", body));
  });

  app.get("/kitchen", async (req, res) => {
    if (!checkPass(req, res)) return;

    const orders = await getOrders();

    const activeOrders = orders
      .filter((o) => !isClosed(o.status))
      .slice()
      .reverse();

    const cards = activeOrders
      .map((o) => {
        const items = (o.items || [])
          .map((item) => `<li>${item.name} — ${money(item.price)}</li>`)
          .join("");

        return `
        <div class="order-card">
          <div class="top-row">
            <h2>${o.orderId}</h2>
            <span>${o.status || "🆕 Yangi"}</span>
          </div>
          <p><b>🏪 Restoran:</b> ${o.restaurant}</p>
          <p><b>👤 Client:</b> ${o.customer || "Client"}</p>
          <p><b>📞 Telefon:</b> ${o.phone || "-"}</p>
          <p><b>📍 Manzil:</b> ${o.address || "-"}</p>
          <ul>${items}</ul>
          <h3>💰 ${money(o.total)}</h3>
        </div>
      `;
      })
      .join("");

    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta http-equiv="refresh" content="10">
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Kitchen Screen</title>
<style>
body{margin:0;font-family:Arial;background:#111827;color:white;padding:20px;}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;}
.header h1{margin:0;font-size:34px;}
.badge{background:#16a34a;padding:10px 16px;border-radius:999px;font-weight:bold;}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px;}
.order-card{background:white;color:#111827;border-radius:22px;padding:18px;box-shadow:0 8px 24px #0005;}
.top-row{display:flex;justify-content:space-between;align-items:center;gap:10px;}
.top-row h2{margin:0;}
.top-row span{background:#f97316;color:white;padding:8px 12px;border-radius:999px;font-weight:bold;}
ul{padding-left:20px;font-size:18px;}
li{margin-bottom:8px;}
h3{font-size:26px;margin-bottom:0;}
.empty{text-align:center;color:#9ca3af;margin-top:80px;font-size:24px;}
</style>
</head>
<body>

<div class="header">
  <h1>👨‍🍳 Kitchen Screen</h1>
  <div class="badge">Active orders: ${activeOrders.length}</div>
</div>

${
  activeOrders.length
    ? `<div class="grid">${cards}</div>`
    : `<div class="empty">Hozircha active order yo‘q</div>`
}

</body>
</html>
`);
  });

  app.post("/admin/:restaurantId/menu/update", async (req, res) => {
    if (!checkPass(req, res)) return;

    const { restaurantId } = req.params;
    const { itemKey, name, price } = req.body;

    await updateMenuItem(restaurantId, itemKey, name, price);
    res.redirect(`/admin/${restaurantId}?pass=${req.query.pass}`);
  });

  app.post("/admin/:restaurantId/menu/delete", async (req, res) => {
    if (!checkPass(req, res)) return;

    const { restaurantId } = req.params;
    const { itemKey } = req.body;

    await deleteMenuItem(restaurantId, itemKey);
    res.redirect(`/admin/${restaurantId}?pass=${req.query.pass}`);
  });

  app.post("/admin/status", async (req, res) => {
    if (!checkPass(req, res)) return;

    const { orderId, status } = req.body;
    const order = await updateOrderStatus(orderId, status);

    if (order && order.chatId) {
      await bot.sendMessage(order.chatId, `📌 Buyurtma holati:\n\n${order.status}`);
    }

    res.redirect(req.headers.referer || `/admin?pass=${req.query.pass}`);
  });
}

module.exports = { adminRoutes };