function createPaymentLink(order) {
  const amount = order.total || 0;

  if (order.paymentType === "click") {
    return `https://my.click.uz/services/pay?service_id=DEMO&merchant_id=BOTFLOW&amount=${amount}&transaction_param=${order.orderId}`;
  }

  if (order.paymentType === "payme") {
    return `https://checkout.paycom.uz/DEMO?amount=${amount * 100}&account[order_id]=${order.orderId}`;
  }

  return null;
}

module.exports = {
  createPaymentLink,
};