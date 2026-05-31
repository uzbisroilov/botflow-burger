const fs = require("fs-extra");

const ORDERS_FILE = "./data/orders.json";

const STATUSES = {
  accepted: "✅ Qabul qilindi",
  cooking: "👨‍🍳 Tayyorlanmoqda",
  delivery: "🚗 Yo‘lda",
  delivered: "🎉 Yetkazildi",
  cancelled: "❌ Bekor qilindi",
};

async function ensureDataFile() {
  await fs.ensureDir("./data");

  if (!(await fs.pathExists(ORDERS_FILE))) {
    await fs.writeJson(ORDERS_FILE, [], {
      spaces: 2,
    });
  }
}

async function getOrders() {
  await ensureDataFile();
  return await fs.readJson(ORDERS_FILE);
}

async function saveOrders(orders) {
  await fs.writeJson(ORDERS_FILE, orders, {
    spaces: 2,
  });
}

async function saveOrder(order) {
  const orders = await getOrders();

  orders.push(order);

  await saveOrders(orders);
}

async function updateOrderStatus(orderId, status) {
  const orders = await getOrders();

  const order = orders.find((o) => o.orderId === orderId);

  if (!order) return null;

  order.status = status;
  order.updatedAt = new Date().toISOString();

  await saveOrders(orders);

  return order;
}

module.exports = {
  STATUSES,
  ensureDataFile,
  getOrders,
  saveOrder,
  updateOrderStatus,
};