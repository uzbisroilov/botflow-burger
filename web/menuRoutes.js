const { getMenus } = require("../services/menuService");

function normalizeMenus(rawMenus) {
  const fallback = {
    burger: {
      id: "burger",
      name: "🍔 BotFlow Burger",
      menu: {
        burger: { name: "🍔 Classic Burger", price: 32000 },
        cheeseburger: { name: "🧀 Cheese Burger", price: 38000 },
        cola: { name: "🥤 Cola", price: 10000 },
        fries: { name: "🍟 Fri", price: 15000 },
      },
    },
    sushi: {
      id: "sushi",
      name: "🍣 Sushi Master",
      menu: {
        california: { name: "🍣 California", price: 48000 },
        philadelphia: { name: "🍱 Philadelphia", price: 55000 },
        cola: { name: "🥤 Cola", price: 10000 },
      },
    },
    coffee: {
      id: "coffee",
      name: "☕ Coffee Time",
      menu: {
        americano: { name: "☕ Americano", price: 18000 },
        latte: { name: "🥛 Latte", price: 26000 },
        cheesecake: { name: "🍰 Cheesecake", price: 32000 },
      },
    },
  };

  const source = rawMenus && Object.keys(rawMenus).length ? rawMenus : fallback;
  const result = {};

  Object.entries(source).forEach(([key, value]) => {
    const restaurantId = value.id || key;
    result[restaurantId] = {
      id: restaurantId,
      name: value.name || restaurantId,
      menu: value.menu || {},
    };
  });

  return result;
}

function menuRoutes(app) {
  app.get("/menu", async (req, res) => {
    let menus = {};

    try {
      menus = normalizeMenus(await getMenus());
    } catch (error) {
      menus = normalizeMenus({});
    }

    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
<script src="https://telegram.org/js/telegram-web-app.js"></script>

<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<title>BotFlow AI Menu</title>

<style>
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;background:#f5f6fa;color:#0b1230;padding-bottom:130px}
.top{background:#111827;color:white;padding:18px 16px 20px}
.brand{font-size:24px;font-weight:800}
.sub{color:#cbd5e1;margin-top:5px;font-size:14px}
.searchBox{padding:12px 14px;background:white}
.searchBox input{width:100%;border:0;outline:none;background:#f1f5f9;border-radius:16px;padding:13px 14px;font-size:15px}
.tabs{display:flex;gap:10px;overflow-x:auto;padding:12px 14px;background:white}
.tabs::-webkit-scrollbar{display:none}
.tab{border:0;border-radius:999px;padding:10px 16px;font-size:14px;font-weight:700;background:#eef2f7;color:#111827;white-space:nowrap}
.tab.active{background:#111827;color:white}
.banner{margin:12px 14px 4px;border-radius:22px;padding:16px;background:linear-gradient(135deg,#f97316,#ef4444);color:white;box-shadow:0 8px 18px rgba(239,68,68,.25)}
.bannerTitle{font-size:20px;font-weight:800}
.bannerText{font-size:14px;margin-top:5px;opacity:.95}
.sectionTitle{padding:12px 16px 4px;font-size:22px;font-weight:900}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:12px 14px}
.card{background:white;border-radius:20px;overflow:hidden;box-shadow:0 8px 20px rgba(15,23,42,.08)}
.card img{width:100%;height:128px;object-fit:cover;display:block}
.cardBody{padding:11px}
.itemName{font-size:15px;font-weight:750;min-height:40px}
.price{margin-top:8px;font-size:16px;font-weight:900;color:#111827}
.controls{margin-top:10px;display:flex;align-items:center;justify-content:space-between;gap:8px}
.addBtn{flex:1;border:0;border-radius:12px;background:#16a34a;color:white;padding:10px 8px;font-weight:800}
.qty{display:flex;align-items:center;gap:7px}
.qty button{width:30px;height:30px;border:0;border-radius:50%;background:#111827;color:white;font-size:18px;font-weight:900}
.qty span{min-width:18px;text-align:center;font-weight:900}
.empty{grid-column:1/3;text-align:center;color:#64748b;padding:40px 10px}
.cart{position:fixed;left:0;right:0;bottom:0;background:white;padding:14px;border-top-left-radius:24px;border-top-right-radius:24px;box-shadow:0 -8px 24px rgba(15,23,42,.14);z-index:20}
.cartRow{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-weight:800}
.orderBtn{width:100%;border:0;border-radius:16px;background:#2563eb;color:white;padding:15px;font-size:17px;font-weight:900}
.checkoutOverlay{position:fixed;inset:0;background:rgba(15,23,42,.55);display:none;align-items:flex-end;z-index:50}
.checkout{width:100%;background:white;border-top-left-radius:26px;border-top-right-radius:26px;padding:18px;max-height:90vh;overflow:auto}
.checkout h2{margin:0 0 12px}
.field{margin-bottom:12px}
.field label{display:block;font-weight:800;margin-bottom:6px}
.field input,.field textarea,.field select{width:100%;border:1px solid #e5e7eb;background:#f8fafc;border-radius:14px;padding:13px;font-size:15px;outline:none}
.field textarea{min-height:76px;resize:none}
.locationBtn{width:100%;border:0;border-radius:14px;background:#111827;color:white;padding:13px;font-weight:900;margin-bottom:12px}
.locationInfo{font-size:13px;color:#16a34a;margin-bottom:10px;font-weight:700}
.checkoutActions{display:flex;gap:10px}
.cancelBtn{flex:1;border:0;border-radius:16px;background:#e5e7eb;padding:14px;font-weight:900}
.submitBtn{flex:2;border:0;border-radius:16px;background:#16a34a;color:white;padding:14px;font-weight:900}
.footer{text-align:center;color:#64748b;font-size:13px;padding-top:6px}

.mapOverlay{position:fixed;inset:0;background:white;display:none;z-index:100}
.mapHeader{height:58px;background:#111827;color:white;display:flex;align-items:center;justify-content:space-between;padding:0 14px;font-weight:900;font-size:18px}
.mapHeader button{border:0;background:transparent;color:white;font-size:24px}
#map{height:calc(100vh - 180px);width:100%}
.mapBottom{height:122px;padding:12px;background:white;box-shadow:0 -6px 18px rgba(15,23,42,.18)}
.mapHint{font-weight:800;margin-bottom:10px;color:#111827}
.mapActions{display:flex;gap:10px}
.gpsBtn{flex:1;border:0;border-radius:14px;background:#111827;color:white;padding:14px;font-weight:900}
.confirmMapBtn{flex:1;border:0;border-radius:14px;background:#16a34a;color:white;padding:14px;font-weight:900}
</style>
</head>

<body>

<div class="top">
  <div class="brand">🚀 BotFlow AI Menu</div>
  <div class="sub">Telegram ichida tezkor buyurtma</div>
</div>

<div class="searchBox">
  <input id="search" placeholder="🔍 Mahsulot qidirish..." oninput="renderMenu()" />
</div>

<div class="tabs" id="tabs"></div>

<div class="banner">
  <div class="bannerTitle">🔥 Bugungi tavsiya</div>
  <div class="bannerText">Taom tanlang, savatga qo‘shing va buyurtmani yuboring.</div>
</div>

<div class="sectionTitle" id="sectionTitle">Menu</div>
<div class="grid" id="grid"></div>

<div class="cart">
  <div class="cartRow">
    <span id="cartCount">🛒 Savat bo‘sh</span>
    <span id="cartTotal">0 UZS</span>
  </div>
  <button class="orderBtn" onclick="openCheckout()">✅ Buyurtma berish</button>
  <div class="footer">@botflow_support_bot</div>
</div>

<div class="checkoutOverlay" id="checkoutOverlay">
  <div class="checkout">
    <h2>🧾 Buyurtmani yakunlash</h2>

    <div class="field">
      <label>📱 Telefon raqam</label>
      <input id="phone" placeholder="+998 90 123 45 67" />
    </div>

    <button class="locationBtn" onclick="openMapPicker()">🗺 Xaritadan lokatsiya tanlash</button>
    <div class="locationInfo" id="locationInfo"></div>

    <div class="field">
      <label>📍 Manzil</label>
      <textarea id="address" placeholder="Ko‘cha, uy, mo‘ljal..."></textarea>
    </div>

    <div class="field">
      <label>💳 To‘lov turi</label>
      <select id="payment">
        <option value="cash">💵 Naqd</option>
        <option value="click">💳 Click</option>
        <option value="payme">💳 Payme</option>
      </select>
    </div>

    <div class="checkoutActions">
      <button class="cancelBtn" onclick="closeCheckout()">Bekor</button>
      <button class="submitBtn" onclick="sendOrder()">Yuborish</button>
    </div>
  </div>
</div>

<div class="mapOverlay" id="mapOverlay">
  <div class="mapHeader">
    <span>📍 Yetkazish manzili</span>
    <button onclick="closeMapPicker()">×</button>
  </div>

  <div id="map"></div>

  <div class="mapBottom">
    <div class="mapHint" id="mapHint">Xaritada joyni bosing yoki GPS ni sinab ko‘ring</div>
    <div class="mapActions">
      <button class="gpsBtn" onclick="useGPS()">🎯 GPS</button>
      <button class="confirmMapBtn" onclick="confirmMapLocation()">✅ Tanlash</button>
    </div>
  </div>
</div>

<script>
const menus = ${JSON.stringify(menus)};
const restaurantIds = Object.keys(menus);
let currentRestaurant = restaurantIds[0] || null;
let cart = [];
let userLocation = null;

let map = null;
let marker = null;
let selectedLatLng = null;

const defaultCenter = [41.311081, 69.240562];

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
  return Number(n || 0).toLocaleString("ru-RU") + " UZS";
}

function renderTabs(){
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = "";

  restaurantIds.forEach(id => {
    const r = menus[id] || {};
    const btn = document.createElement("button");
    btn.className = "tab" + (id === currentRestaurant ? " active" : "");
    btn.innerText = r.name || id || "Restaurant";
    btn.onclick = () => {
      currentRestaurant = id;
      renderTabs();
      renderMenu();
    };
    tabs.appendChild(btn);
  });
}

function getQty(key){
  return cart.filter(i => i.key === key && i.restaurantId === currentRestaurant).length;
}

function renderMenu(){
  const grid = document.getElementById("grid");
  const title = document.getElementById("sectionTitle");
  const search = (document.getElementById("search").value || "").toLowerCase();

  grid.innerHTML = "";

  if(!currentRestaurant || !menus[currentRestaurant]){
    grid.innerHTML = '<div class="empty">Menu topilmadi</div>';
    return;
  }

  const restaurant = menus[currentRestaurant];
  title.innerText = restaurant.name || "Menu";

  const entries = Object.entries(restaurant.menu || {}).filter(([key,item]) => {
    const name = (item.name || "").toLowerCase();
    return name.includes(search);
  });

  if(!entries.length){
    grid.innerHTML = '<div class="empty">Mahsulot topilmadi</div>';
    return;
  }

  entries.forEach(([key,item]) => {
    const qty = getQty(key);
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = \`
      <img src="\${images[key] || images.burger}" />
      <div class="cardBody">
        <div class="itemName">\${item.name || "Mahsulot"}</div>
        <div class="price">\${money(item.price)}</div>
        <div class="controls">
          <button class="addBtn" onclick="addToCart('\${key}')">+ Qo‘shish</button>
          <div class="qty">
            <button onclick="removeFromCart('\${key}')">−</button>
            <span>\${qty}</span>
            <button onclick="addToCart('\${key}')">+</button>
          </div>
        </div>
      </div>
    \`;
    grid.appendChild(card);
  });
}

function addToCart(key){
  const item = menus[currentRestaurant].menu[key];

  cart.push({
    key,
    restaurantId: currentRestaurant,
    name: item.name,
    price: Number(item.price || 0)
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
  const total = cart.reduce((sum,item)=>sum + Number(item.price || 0),0);

  document.getElementById("cartCount").innerText =
    cart.length ? "🛒 " + cart.length + " ta mahsulot" : "🛒 Savat bo‘sh";

  document.getElementById("cartTotal").innerText = money(total);
}

function autoDetectLocation(){
  if(!navigator.geolocation){
    document.getElementById("locationInfo").innerText =
      "GPS ishlamadi, xaritadan tanlang";
    return;
  }

  document.getElementById("locationInfo").innerText =
    "🎯 Lokatsiya avtomatik aniqlanmoqda...";

  navigator.geolocation.getCurrentPosition(
    function(pos){
      userLocation = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude
      };

      selectedLatLng = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };

      document.getElementById("locationInfo").innerText =
        "✅ Lokatsiya avtomatik aniqlandi";

      document.getElementById("address").value =
        "📍 GPS orqali avtomatik aniqlandi";

      if(map && marker){
        marker.setLatLng([selectedLatLng.lat, selectedLatLng.lng]);
        map.setView([selectedLatLng.lat, selectedLatLng.lng], 17);
      }
    },
    function(){
      document.getElementById("locationInfo").innerText =
        "GPS ruxsat olmadi, xaritadan tanlang";
    },
    {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0
    }
  );
}

function openCheckout(){
  if(!cart.length){
    alert("Savat bo‘sh");
    return;
  }

  document.getElementById("checkoutOverlay").style.display = "flex";

  setTimeout(() => {
    autoDetectLocation();
  }, 500);
}

function closeCheckout(){
  document.getElementById("checkoutOverlay").style.display = "none";
}

function openMapPicker(){
  document.getElementById("mapOverlay").style.display = "block";

  setTimeout(() => {
    if(!map){
      map = L.map("map").setView(defaultCenter, 14);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap"
      }).addTo(map);

      marker = L.marker(defaultCenter, { draggable: true }).addTo(map);
      selectedLatLng = { lat: defaultCenter[0], lng: defaultCenter[1] };

      map.on("click", function(e){
        selectedLatLng = e.latlng;
        marker.setLatLng(e.latlng);
        document.getElementById("mapHint").innerText =
          "✅ Lokatsiya tanlandi";
      });

      marker.on("dragend", function(){
        selectedLatLng = marker.getLatLng();
        document.getElementById("mapHint").innerText =
          "✅ Lokatsiya tanlandi";
      });
    }

    map.invalidateSize();

    if(selectedLatLng){
      map.setView([selectedLatLng.lat, selectedLatLng.lng], 16);
      marker.setLatLng([selectedLatLng.lat, selectedLatLng.lng]);
    }
  }, 300);
}

function closeMapPicker(){
  document.getElementById("mapOverlay").style.display = "none";
}

function useGPS(){
  autoDetectLocation();

  setTimeout(() => {
    if(selectedLatLng && map && marker){
      marker.setLatLng([selectedLatLng.lat, selectedLatLng.lng]);
      map.setView([selectedLatLng.lat, selectedLatLng.lng], 17);
      document.getElementById("mapHint").innerText =
        "✅ GPS orqali lokatsiya aniqlandi";
    } else {
      document.getElementById("mapHint").innerText =
        "GPS ruxsat olmadi. Xaritadan pin qo‘ying.";
    }
  }, 1500);
}

function confirmMapLocation(){
  if(!selectedLatLng){
    alert("Xaritadan joy tanlang");
    return;
  }

  userLocation = {
    latitude: selectedLatLng.lat,
    longitude: selectedLatLng.lng
  };

  document.getElementById("locationInfo").innerText =
    "✅ Lokatsiya tanlandi";

  document.getElementById("address").value =
    "🗺 Xaritadan lokatsiya tanlandi";

  closeMapPicker();
}

function sendOrder(){
  if(!cart.length){
    alert("Savat bo‘sh");
    return;
  }

  const phone = document.getElementById("phone").value.trim();
  const address = document.getElementById("address").value.trim();
  const paymentType = document.getElementById("payment").value;

  if(!phone){
    alert("Telefon raqam kiriting");
    return;
  }

  if(!address && !userLocation){
    alert("Manzil kiriting yoki xaritadan lokatsiya tanlang");
    return;
  }

  const restaurantId = cart[0].restaurantId;
  const items = cart.filter(i => i.restaurantId === restaurantId);
  const total = items.reduce((sum,item)=>sum + Number(item.price || 0),0);

  const payload = {
    type: "web_order_full",
    restaurantId,
    items,
    total,
    phone,
    address: address || "Xaritadan lokatsiya tanlandi",
    paymentType,
    location: userLocation
  };

  if(window.Telegram && Telegram.WebApp){
    Telegram.WebApp.sendData(JSON.stringify(payload));
    Telegram.WebApp.close();
  } else {
    alert(JSON.stringify(payload));
  }
}

renderTabs();
renderMenu();
renderCart();

if(window.Telegram && Telegram.WebApp){
  Telegram.WebApp.ready();
  Telegram.WebApp.expand();

  setTimeout(() => {
    autoDetectLocation();
  }, 1000);
}
</script>

</body>
</html>
`);
  });
}

module.exports = { menuRoutes };