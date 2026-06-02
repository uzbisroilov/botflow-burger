const { getMenus } = require("../services/menuService");

function menuRoutes(app) {
  app.get("/menu", async (req, res) => {
    const menus = await getMenus();

    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<title>BotFlow Menu</title>

<style>
*{box-sizing:border-box}
body{
  margin:0;
  font-family:Arial, sans-serif;
  background:#f3f4f6;
  color:#111827;
  padding-bottom:110px;
}
.header{
  background:linear-gradient(135deg,#111827,#1f2937);
  color:white;
  padding:20px 16px 28px;
  border-bottom-left-radius:24px;
  border-bottom-right-radius:24px;
}
.header h1{
  margin:0;
  font-size:24px;
}
.header p{
  margin:8px 0 0;
  color:#d1d5db;
}
.search{
  margin:14px 16px 8px;
}
.search input{
  width:100%;
  border:0;
  border-radius:16px;
  padding:14px;
  font-size:15px;
  box-shadow:0 4px 14px #0001;
}
.tabs{
  display:flex;
  gap:10px;
  padding:10px 16px;
  overflow-x:auto;
}
.tabs button{
  white-space:nowrap;
  border:0;
  padding:11px 16px;
  border-radius:999px;
  background:white;
  box-shadow:0 3px 10px #0001;
  font-weight:bold;
}
.tabs button.active{
  background:#111827;
  color:white;
}
.banner{
  margin:10px 16px;
  background:linear-gradient(135deg,#f97316,#ef4444);
  color:white;
  border-radius:20px;
  padding:16px;
  box-shadow:0 6px 18px #0002;
}
.banner b{
  font-size:20px;
}
.grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:14px;
  padding:14px 16px;
}
.card{
  background:white;
  border-radius:20px;
  overflow:hidden;
  box-shadow:0 6px 18px #0001;
}
.card img{
  width:100%;
  height:125px;
  object-fit:cover;
}
.body{
  padding:12px;
}
.name{
  font-size:15px;
  font-weight:bold;
  min-height:40px;
}
.price{
  margin-top:8px;
  font-weight:bold;
  color:#16a34a;
}
.controls{
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-top:10px;
}
.add{
  border:0;
  background:#16a34a;
  color:white;
  padding:9px 12px;
  border-radius:12px;
  font-weight:bold;
}
.qty{
  display:flex;
  align-items:center;
  gap:8px;
}
.qty button{
  width:28px;
  height:28px;
  border:0;
  border-radius:50%;
  background:#111827;
  color:white;
  font-weight:bold;
}
.cart{
  position:fixed;
  left:0;
  right:0;
  bottom:0;
  background:white;
  padding:14px 16px;
  box-shadow:0 -6px 20px #0002;
  border-top-left-radius:22px;
  border-top-right-radius:22px;
}
.cartTop{
  display:flex;
  justify-content:space-between;
  margin-bottom:10px;
  font-weight:bold;
}
.order{
  width:100%;
  border:0;
  background:#2563eb;
  color:white;
  padding:15px;
  border-radius:16px;
  font-size:16px;
  font-weight:bold;
}
.empty{
  padding:30px;
  text-align:center;
  color:#6b7280;
}
</style>
</head>

<body>

<div class="header">
  <h1>🚀 BotFlow AI Menu</h1>
  <p>Tez, qulay va aqlli buyurtma</p>
</div>

<div class="search">
  <input id="search" placeholder="🔍 Mahsulot qidirish..." oninput="renderMenu()" />
</div>

<div class="tabs" id="tabs"></div>

<div class="banner">
  <b>🔥 Bugungi tavsiya</b>
  <p>Menu’dan taom tanlang, savatga qo‘shing va buyurtma yuboring.</p>
</div>

<div class="grid" id="grid"></div>

<div class="cart">
  <div class="cartTop">
    <span id="cartCount">🛒 Savat bo‘sh</span>
    <span id="cartTotal">0 UZS</span>
  </div>
  <button class="order" onclick="sendOrder()">✅ Buyurtma berish</button>
</div>

<script>
const menus = ${JSON.stringify(menus)};
let currentRestaurant = Object.keys(menus)[0];
let cart = [];

const images = {
  burger: "https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg",
  cheeseburger: "https://images.pexels.com/photos/2983101/pexels-photo-2983101.jpeg",
  cola: "https://images.pexels.com/photos/2775860/pexels-photo-2775860.jpeg",
  fries: "https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg",
  california: "https://images.pexels.com/photos/357756/pexels-photo-357756.jpeg",
  philadelphia: "https://images.pexels.com/photos/2098085/pexels-photo-2098085.jpeg",
  americano: "https://images.pexels.com/photos/374885/pexels-photo-374885.jpeg",
  latte: "https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg",
  cheesecake: "https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg"
};

function money(n){
  return Number(n || 0).toLocaleString() + " UZS";
}

function renderTabs(){
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = "";

  Object.values(menus).forEach(r => {
    const btn = document.createElement("button");
    btn.innerText = r.name;
    btn.className = r.id === currentRestaurant ? "active" : "";
    btn.onclick = () => {
      currentRestaurant = r.id;
      renderTabs();
      renderMenu();
    };
    tabs.appendChild(btn);
  });
}

function itemQty(key){
  return cart.filter(i => i.key === key && i.restaurantId === currentRestaurant).length;
}

function renderMenu(){
  const grid = document.getElementById("grid");
  const search = document.getElementById("search").value.toLowerCase();
  grid.innerHTML = "";

  const restaurant = menus[currentRestaurant];
  const entries = Object.entries(restaurant.menu || {}).filter(([key,item]) =>
    item.name.toLowerCase().includes(search)
  );

  if(!entries.length){
    grid.innerHTML = '<div class="empty">Mahsulot topilmadi</div>';
    return;
  }

  entries.forEach(([key,item]) => {
    const qty = itemQty(key);
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = \`
      <img src="\${images[key] || images.burger}" />
      <div class="body">
        <div class="name">\${item.name}</div>
        <div class="price">\${money(item.price)}</div>
        <div class="controls">
          <button class="add" onclick="addToCart('\${key}')">+ Qo‘shish</button>
          <div class="qty">
            <button onclick="removeFromCart('\${key}')">−</button>
            <b>\${qty}</b>
            <button onclick="addToCart('\${key}')">+</button>
          </div>
        </div>
      </div>
    \`;

    grid.appendChild(div);
  });
}

function addToCart(key){
  const item = menus[currentRestaurant].menu[key];

  cart.push({
    key,
    restaurantId: currentRestaurant,
    name: item.name,
    price: Number(item.price)
  });

  renderCart();
  renderMenu();
}

function removeFromCart(key){
  const index = cart.findIndex(i => i.key === key && i.restaurantId === currentRestaurant);
  if(index >= 0){
    cart.splice(index,1);
  }

  renderCart();
  renderMenu();
}

function renderCart(){
  const total = cart.reduce((s,i)=>s+i.price,0);
  document.getElementById("cartCount").innerText =
    cart.length ? "🛒 " + cart.length + " ta mahsulot" : "🛒 Savat bo‘sh";
  document.getElementById("cartTotal").innerText = money(total);
}

function sendOrder(){
  if(!cart.length){
    alert("Savat bo‘sh");
    return;
  }

  const restaurantId = cart[0].restaurantId;
  const cleanCart = cart.filter(i => i.restaurantId === restaurantId);

  Telegram.WebApp.sendData(JSON.stringify({
    type: "web_order",
    restaurantId,
    items: cleanCart,
    total: cleanCart.reduce((s,i)=>s+i.price,0)
  }));

  Telegram.WebApp.close();
}

renderTabs();
renderMenu();
renderCart();

if(window.Telegram && Telegram.WebApp){
  Telegram.WebApp.ready();
  Telegram.WebApp.expand();
}
</script>

</body>
</html>
`);
  });
}

module.exports = { menuRoutes };