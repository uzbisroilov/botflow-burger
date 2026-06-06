function isToday(dateString) {
  if (!dateString) return false;

  const d = new Date(dateString);
  const now = new Date();

  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function moneyNumber(n) {
  return Number(n || 0);
}

function getAnalytics(orders = []) {
  const todayOrders = orders.filter((o) => isToday(o.createdAt));

  const totalRevenue = orders.reduce((sum, o) => sum + moneyNumber(o.total), 0);
  const todayRevenue = todayOrders.reduce((sum, o) => sum + moneyNumber(o.total), 0);

  const averageCheck = orders.length ? Math.round(totalRevenue / orders.length) : 0;
  const todayAverageCheck = todayOrders.length
    ? Math.round(todayRevenue / todayOrders.length)
    : 0;

  const activeOrders = orders.filter(
    (o) => o.status !== "🎉 Yetkazildi" && o.status !== "❌ Bekor qilindi"
  ).length;

  const deliveredOrders = orders.filter((o) => o.status === "🎉 Yetkazildi").length;
  const cancelledOrders = orders.filter((o) => o.status === "❌ Bekor qilindi").length;

  const productStats = {};

  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      if (!productStats[item.name]) {
        productStats[item.name] = {
          name: item.name,
          count: 0,
          revenue: 0,
        };
      }

      productStats[item.name].count += 1;
      productStats[item.name].revenue += moneyNumber(item.price);
    });
  });

  const topProducts = Object.values(productStats)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalRevenue,
    todayRevenue,
    totalOrders: orders.length,
    todayOrders: todayOrders.length,
    averageCheck,
    todayAverageCheck,
    activeOrders,
    deliveredOrders,
    cancelledOrders,
    topProducts,
  };
}

module.exports = {
  getAnalytics,
};