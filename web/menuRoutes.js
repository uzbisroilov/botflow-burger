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
body{font-family:Arial;margin:0;background:#f4f6f8;color:#101828}
.header{background:#111827;color:white;padding:18px;font-size:22px;font-weight:bold}
.tabs{display:flex;gap:10px;padding:12px;overflow:auto;background:white}
.tabs button{border:0;border-radius:20px;padding:10px 16px;background:#e5e7eb;font-weight:bold}
.tabs button.active{background:#111827;color:white}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:14px}
.card{background:white;border-radius:16px;box-shadow:0 4px 12px #0001;overflow:hidden}
.card img{width:100%;height:120px;object-fit:cover}
.card .body{padding:10px}
.name{font-size:15px;font-weight:bold;min-height:38px}
.price{margin-top:8px;background:#f8fafc;border-radius:10px;padding:10px;text-align:center;font-weight:bold}
.add{margin-top:8px;width:100%;border:0;background:#16a34a;color:white;padding:10px;border-radius:10px;font-weight:bold}
.cart{position:fixed;bottom:0;left:0;right:0;background:white;padding:12px;box-shadow:0 -4px 12px #0002}
.order{width:100%;border:0;background:#2563eb;color:white;padding:14px;border-radius:14px;font-size:16px;font-weight:bold}
</style>
</head>
<body>

<div class="header">🚀 BotFlow AI Menu</div>
<div class="tabs" id="tabs"></div>
<div class="grid" id="grid"></div>

<div class="cart">
  <div id="cartText">🛒 Savat bo‘sh</div>
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

function renderMenu(){
  const grid = document.getElementById("grid");
  grid.innerHTML = "";
  const restaurant = menus[currentRestaurant];

  Object.entries(restaurant.menu).forEach(([key, item]) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = \`
      <img src="\${images[key] || images.burger}">
      <div class="body">
        <div class="name">\${item.name}</div>
        <div class="price">\${item.price.toLocaleString()} UZS</div>
        <button class="add" onclick="addToCart('\${key}')">+ Qo‘shish</button>
      </div>
    \`;
    grid.appendChild(div);
  });
}

function addToCart(key){
  const item = menus[currentRestaurant].menu[key];
  cart.push({
    restaurantId: currentRestaurant,
    name: item.name,
    price: item.price
  });
  renderCart();
}

function renderCart(){
  const total = cart.reduce((s,i)=>s+i.price,0);
  document.getElementById("cartText").innerText =
    cart.length ? "🛒 " + cart.length + " ta | " + total.toLocaleString() + " UZS" : "🛒 Savat bo‘sh";
}

function sendOrder(){
  if(!cart.length){
    alert("Savat bo‘sh");
    return;
  }

  Telegram.WebApp.sendData(JSON.stringify({
    type: "web_order",
    restaurantId: currentRestaurant,
    items: cart,
    total: cart.reduce((s,i)=>s+i.price,0)
  }));

  Telegram.WebApp.close();
}

renderTabs();
renderMenu();
renderCart();
Telegram.WebApp.ready();
</script>

</body>
</html>
`);
  });
}

module.exports = { menuRoutes };