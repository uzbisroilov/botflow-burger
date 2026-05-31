const { getOrders, updateOrderStatus } = require("../services/orderService");
const { getMenus, updateMenuItem, deleteMenuItem } = require("../services/menuService");

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

function restaurantLinksHtml(menus) {
  const botUsername = "botflow_support_bot";

  return Object.values(menus)
    .map((r) => {
      const base = `https://t.me/${botUsername}?start=restaurant_${r.id}`;
      const table1 = `https://t.me/${botUsername}?start=restaurant_${r.id}_table_1`;
      const table2 = `https://t.me/${botUsername}?start=restaurant_${r.id}_table_2`;

      return `
        <div class="qr-card">
          <h3>${r.name}</h3>
          <p><b>Owner panel:</b><br><a href="/admin/${r.id}" target="_blank">/admin/${r.id}</a></p>
          <p><b>General:</b><br><a href="${base}" target="_blank">${base}</a></p>
          <p><b>Table 1:</b><br><a href="${table1}" target="_blank">${table1}</a></p>
          <p><b>Table 2:</b><br><a href="${table2}" target="_blank">${table2}</a></p>
          <p><img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(table1)}" /></p>
        </div>
      `;
    })
    .join("");
}

function ordersRows(orders, showRestaurant = true, showActions = true) {
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
  <td><b>${o.status || "Yangi"}</b></td>
  <td>${date}</td>
  ${showActions ? `<td>${actionButtons(o)}</td>` : ""}
</tr>
`;
    })
    .join("");
}

function menuEditorHtml(restaurant) {
  const rows = Object.entries(restaurant.menu)
    .map(([key, item]) => {
      return `
<tr>
  <td>${key}</td>
  <td>
    <form method="POST" action="/admin/${restaurant.id}/menu/update">
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
    <form method="POST" action="/admin/${restaurant.id}/menu/delete">
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

  <h3>➕ Yangi mahsulot qo‘shish</h3>
  <form method="POST" action="/admin/${restaurant.id}/menu/update" class="menu-form">
    <input name="itemKey" placeholder="key masalan: double_burger" required />
    <input name="name" placeholder="Nomi masalan: 🍔 Double Burger" required />
    <input name="price" placeholder="Narxi" type="number" required />
    <button class="blue">Add</button>
  </form>

  <h3>📋 Mavjud menu</h3>
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
<meta http-equiv="refresh" content="30">
<title>${title}</title>
<style>
body{font-family:Arial;background:#f4f6f8;padding:20px;}
h1{font-size:34px;margin-bottom:8px;}
.subtitle{color:#6b7280;margin-bottom:20px;}
.cards{display:flex;gap:15px;margin-bottom:20px;flex-wrap:wrap;}
.card{background:white;padding:16px;border-radius:16px;min-width:180px;box-shadow:0 3px 10px #0001;}
.card b{font-size:22px;}
.panel{background:white;padding:16px;border-radius:16px;margin-bottom:20px;box-shadow:0 3px 10px #0001;}
.qr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:15px;}
.qr-card{background:white;padding:16px;border-radius:16px;box-shadow:0 3px 10px #0001;word-break:break-all;}
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
a{color:#2563eb;}
.menu-form{display:flex;gap:8px;flex-wrap:wrap;}
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
    const orders = await getOrders();
    const menus = await getMenus();
    const a = analytics(orders);

    const body = `
<div class="cards">
  <div class="card">🛒 Orders<br><br><b>${orders.length}</b></div>
  <div class="card">🟡 Active<br><br><b>${a.active}</b></div>
  <div class="card">🎉 Delivered<br><br><b>${a.delivered}</b></div>
  <div class="card">❌ Cancelled<br><br><b>${a.cancelled}</b></div>
  <div class="card">💰 Revenue<br><br><b>${money(a.revenue)}</b></div>
</div>

<div class="panel">
  <h2>🔗 QR Menu Links</h2>
  <div class="qr-grid">${restaurantLinksHtml(menus)}</div>
</div>

<table>
<thead>
<tr>
<th>ID</th><th>Restaurant</th><th>Table</th><th>Customer</th><th>Phone</th>
<th>Address</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th>Actions</th>
</tr>
</thead>
<tbody>${ordersRows(orders, true, true)}</tbody>
</table>
`;

    res.send(pageLayout("🚀 BotFlow Admin Panel", "Menu Editor + QR + Multi Restaurant SaaS", body));
  });

  app.get("/admin/:restaurantId", async (req, res) => {
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

${menuEditorHtml(restaurant)}

<table>
<thead>
<tr>
<th>ID</th><th>Table</th><th>Customer</th><th>Phone</th><th>Address</th>
<th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th>Actions</th>
</tr>
</thead>
<tbody>${ordersRows(orders, false, true)}</tbody>
</table>
`;

    res.send(pageLayout(`${restaurant.name} Owner Panel`, "Restaurant owner dashboard + menu editor", body));
  });

  app.post("/admin/:restaurantId/menu/update", async (req, res) => {
    const { restaurantId } = req.params;
    const { itemKey, name, price } = req.body;

    await updateMenuItem(restaurantId, itemKey, name, price);

    res.redirect(`/admin/${restaurantId}`);
  });

  app.post("/admin/:restaurantId/menu/delete", async (req, res) => {
    const { restaurantId } = req.params;
    const { itemKey } = req.body;

    await deleteMenuItem(restaurantId, itemKey);

    res.redirect(`/admin/${restaurantId}`);
  });

  app.post("/admin/status", async (req, res) => {
    const { orderId, status } = req.body;
    const order = await updateOrderStatus(orderId, status);

    if (order && order.chatId) {
      await bot.sendMessage(order.chatId, `📌 Buyurtma holati:\n\n${order.status}`);
    }

    res.redirect(req.headers.referer || "/admin");
  });
}

module.exports = { adminRoutes };