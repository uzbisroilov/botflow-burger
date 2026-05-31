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

function orderItemsText(order) {
  if (
    !order.items ||
    order.items.length === 0
  ) {
    return "-";
  }

  return order.items
    .map((item, i) => {
      return `${i + 1}. ${item.name} — ${money(item.price)}`;
    })
    .join("<br>");
}

function adminRoutes(app, bot) {
  app.get("/admin", async (req, res) => {
    const orders = await getOrders();

    const revenue = orders.reduce(
      (sum, order) => {
        return sum + (order.total || 0);
      },
      0
    );

    const rows = orders
      .slice()
      .reverse()
      .map((o) => {
        const date = o.createdAt
          ? new Date(
              o.createdAt
            ).toLocaleString(
              "ru-RU"
            )
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

  <td>
    <b>${o.status}</b>
  </td>

  <td>${date}</td>

  <td>

    <form
      method="POST"
      action="/admin/status"
      style="display:inline"
    >

      <input
        type="hidden"
        name="orderId"
        value="${o.orderId}"
      />

      <input
        type="hidden"
        name="status"
        value="✅ Qabul qilindi"
      />

      <button class="green">
        Qabul
      </button>

    </form>

    <form
      method="POST"
      action="/admin/status"
      style="display:inline"
    >

      <input
        type="hidden"
        name="orderId"
        value="${o.orderId}"
      />

      <input
        type="hidden"
        name="status"
        value="👨‍🍳 Tayyorlanmoqda"
      />

      <button class="orange">
        Tayyor
      </button>

    </form>

    <form
      method="POST"
      action="/admin/status"
      style="display:inline"
    >

      <input
        type="hidden"
        name="orderId"
        value="${o.orderId}"
      />

      <input
        type="hidden"
        name="status"
        value="🚗 Yo‘lda"
      />

      <button class="blue">
        Yo‘lda
      </button>

    </form>

    <form
      method="POST"
      action="/admin/status"
      style="display:inline"
    >

      <input
        type="hidden"
        name="orderId"
        value="${o.orderId}"
      />

      <input
        type="hidden"
        name="status"
        value="🎉 Yetkazildi"
      />

      <button class="purple">
        Yetkazildi
      </button>

    </form>

    <form
      method="POST"
      action="/admin/status"
      style="display:inline"
    >

      <input
        type="hidden"
        name="orderId"
        value="${o.orderId}"
      />

      <input
        type="hidden"
        name="status"
        value="❌ Bekor qilindi"
      />

      <button class="red">
        Bekor
      </button>

    </form>

  </td>

</tr>
`;
      })
      .join("");

    res.send(`
<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8" />

<title>
BotFlow Admin
</title>

<style>

body{
  font-family:Arial;
  background:#f4f6f8;
  padding:20px;
}

h1{
  font-size:32px;
}

.cards{
  display:flex;
  gap:15px;
  margin-bottom:20px;
}

.card{
  background:white;
  padding:15px;
  border-radius:15px;
  min-width:180px;
  box-shadow:0 3px 10px #0001;
}

table{
  width:100%;
  border-collapse:collapse;
  background:white;
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

.green{
  background:#16a34a;
}

.orange{
  background:#ea580c;
}

.blue{
  background:#2563eb;
}

.purple{
  background:#7c3aed;
}

.red{
  background:#dc2626;
}

</style>

</head>

<body>

<h1>
🚀 BotFlow Admin Panel
</h1>

<div class="cards">

<div class="card">
🛒 Orders
<br><br>
<b>${orders.length}</b>
</div>

<div class="card">
💰 Revenue
<br><br>
<b>${money(revenue)}</b>
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

  app.post(
    "/admin/status",
    async (req, res) => {
      const {
        orderId,
        status,
      } = req.body;

      const order =
        await updateOrderStatus(
          orderId,
          status
        );

      if (
        order &&
        order.chatId
      ) {
        await bot.sendMessage(
          order.chatId,

          `📌 Buyurtma holati:

${order.status}`
        );
      }

      res.redirect("/admin");
    }
  );
}

module.exports = {
  adminRoutes,
};