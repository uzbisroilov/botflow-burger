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
    } catch {
      menus = normalizeMenus({});
    }

    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"/>
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<title>BotFlow AI Menu</title>

<style>
*{box-sizing:border-box}
:root{
  --bg:#f6f7fb;
  --dark:#0f172a;
  --muted:#64748b;
  --card:#ffffff;
  --green:#16a34a;
  --blue:#2563eb;
  --orange:#f97316;
  --red:#ef4444;
}
body{
  margin:0;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
  background:var(--bg);
  color:var(--dark);
  padding-bottom:128px;
}
.hero{
  padding:20px 16px 24px;
  background:linear-gradient(145deg,#0f172a,#1e293b);
  color:white;
  border-bottom-left-radius:28px;
  border-bottom-right-radius:28px;
}
.heroTop{
  display:flex;
  justify-content:space-between;
  align-items:center;
}
.logo{
  font-size:25px;
  font-weight:900;
}
.badge{
  background:rgba(255,255,255,.12);
  padding:8px 12px;
  border-radius:999px;
  font-size:13px;
  font-weight:800;
}
.heroTitle{
  margin-top:18px;
  font-size:28px;
  line-height:1.1;
  font-weight:950;
}
.heroText{
  margin-top:8px;
  color:#cbd5e1;
  font-size:15px;
}
.promo{
  margin-top:16px;
  padding:14px;
  border-radius:20px;
  background:linear-gradient(135deg,#f97316,#ef4444);
  box-shadow:0 10px 24px rgba(239,68,68,.28);
}
.promo b{
  font-size:18px;
}
.promo p{
  margin:5px 0 0;
  font-size:13px;
  opacity:.95;
}
.searchWrap{
  margin:-18px 16px 8px;
  position:relative;
  z-index:3;
}
.searchWrap input{
  width:100%;
  border:0;
  outline:none;
  background:white;
  border-radius:18px;
  padding:15px 16px;
  font-size:15px;
  box-shadow:0 10px 28px rgba(15,23,42,.12);
}
.tabs{
  display:flex;
  gap:10px;
  overflow-x:auto;
  padding:12px 16px 8px;
}
.tabs::-webkit-scrollbar{display:none}
.tab{
  border:0;
  background:white;
  color:#111827;
  border-radius:999px;
  padding:11px 16px;
  font-size:14px;
  font-weight:900;
  white-space:nowrap;
  box-shadow:0 6px 16px rgba(15,23,42,.07);
}
.tab.active{
  background:#111827;
  color:white;
}
.sectionHead{
  padding:12px 16px 4px;
  display:flex;
  align-items:end;
  justify-content:space-between;
}
.sectionTitle{
  font-size:23px;
  font-weight:950;
}
.sectionSub{
  color:var(--muted);
  font-size:13px;
  font-weight:700;
}
.grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:14px;
  padding:12px 16px;
}
.card{
  background:white;
  border-radius:24px;
  overflow:hidden;
  box-shadow:0 8px 24px rgba(15,23,42,.08);
  position:relative;
}
.card img{
  width:100%;
  height:132px;
  object-fit:cover;
  display:block;
}
.cardTag{
  position:absolute;
  top:10px;
  left:10px;
  background:rgba(15,23,42,.82);
  color:white;
  padding:5px 8px;
  border-radius:999px;
  font-size:11px;
  font-weight:900;
}
.cardBody{
  padding:12px;
}
.itemName{
  font-size:15px;
  font-weight:900;
  min-height:40px;
}
.itemDesc{
  color:var(--muted);
  font-size:12px;
  margin-top:4px;
  min-height:28px;
}
.price{
  margin-top:8px;
  font-size:17px;
  font-weight:950;
}
.controls{
  margin-top:11px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
}
.addBtn{
  flex:1;
  border:0;
  border-radius:14px;
  background:var(--green);
  color:white;
  padding:11px 8px;
  font-weight:950;
}
.qty{
  display:flex;
  align-items:center;
  gap:7px;
}
.qty button{
  width:31px;
  height:31px;
  border:0;
  border-radius:50%;
  background:#111827;
  color:white;
  font-size:18px;
  font-weight:950;
}
.qty span{
  min-width:18px;
  text-align:center;
  font-weight:950;
}
.empty{
  grid-column:1/3;
  text-align:center;
  padding:44px 10px;
  color:var(--muted);
}
.cart{
  position:fixed;
  left:0;
  right:0;
  bottom:0;
  z-index:20;
  background:white;
  padding:14px 16px;
  border-top-left-radius:26px;
  border-top-right-radius:26px;
  box-shadow:0 -10px 28px rgba(15,23,42,.16);
}
.cartRow{
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-bottom:10px;
}
.cartCount{
  font-weight:950;
}
.cartTotal{
  font-weight:950;
  color:#16a34a;
}
.orderBtn{
  width:100%;
  border:0;
  border-radius:18px;
  background:linear-gradient(135deg,#2563eb,#1d4ed8);
  color:white;
  padding:16px;
  font-size:17px;
  font-weight:950;
}
.checkoutOverlay{
  position:fixed;
  inset:0;
  background:rgba(15,23,42,.58);
  display:none;
  align-items:flex-end;
  z-index:50;
}
.checkout{
  width:100%;
  background:white;
  border-top-left-radius:30px;
  border-top-right-radius:30px;
  padding:20px;
  max-height:92vh;
  overflow:auto;
}
.checkout h2{
  margin:0 0 14px;
  font-size:23px;
}
.field{margin-bottom:13px}
.field label{
  display:block;
  font-weight:900;
  margin-bottom:7px;
}
.field input,.field textarea,.field select{
  width:100%;
  border:1px solid #e5e7eb;
  background:#f8fafc;
  border-radius:16px;
  padding:14px;
  font-size:15px;
  outline:none;
}
.field textarea{
  min-height:80px;
  resize:none;
}
.locationBtn{
  width:100%;
  border:0;
  border-radius:16px;
  background:#111827;
  color:white;
  padding:14px;
  font-weight:950;
  margin-bottom:10px;
}
.locationInfo{
  color:#16a34a;
  font-size:13px;
  font-weight:800;
  margin-bottom:12px;
}
.checkoutActions{
  display:flex;
  gap:10px;
}
.cancelBtn{
  flex:1;
  border:0;
  border-radius:16px;
  background:#e5e7eb;
  padding:15px;
  font-weight:950;
}
.submitBtn{
  flex:2;
  border:0;
  border-radius:16px;
  background:#16a34a;
  color:white;
  padding:15px;
  font-weight:950;
}
.mapOverlay{
  position:fixed;
  inset:0;
  background:white;
  display:none;
  z-index:100;
}
.mapHeader{
  height:60px;
  background:#111827;
  color:white;
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:0 16px;
  font-weight:950;
  font-size:18px;
}
.mapHeader button{
  border:0;
  background:transparent;
  color:white;
  font-size:26px;
}
#map{
  height:calc(100vh - 184px);
  width:100%;
}
.mapBottom{
  height:124px;
  padding:12px;
  background:white;
  box-shadow:0 -8px 22px rgba(15,23,42,.18);
}
.mapHint{
  font-weight:900;
  margin-bottom:10px;
}
.mapActions{
  display:flex;
  gap:10px;
}
.gpsBtn,.confirmMapBtn{
  flex:1;
  border:0;
  border-radius:16px;
  padding:15px;
  color:white;
  font-weight:950;
}
.gpsBtn{background:#111827}
.confirmMapBtn{background:#16a34a}
</style>
</head>

<body>
<div class="hero">
  <div class="heroTop">
    <div class="logo">BotFlow AI</div>
    <div class="badge">⚡ Fast order</div>
  </div>
  <div class="heroTitle">Mazali taomni tez buyurtma qiling</div>
  <div class="heroText">Telegram ichida professional restoran menyusi</div>
  <div class="promo">
    <b>🔥 Bugungi tavsiya</b>
    <p>Taom tanlang, savatga qo‘shing va buyurtmani bir necha soniyada yuboring.</p>
  </div>
</div>

<div class="searchWrap">
  <input id="search" placeholder="🔍 Mahsulot qidirish..." oninput="renderMenu()"/>
</div>

<div class="tabs" id="tabs"></div>

<div class="sectionHead">
  <div>
    <div class="sectionTitle" id="sectionTitle">Menu</div>
    <div class="sectionSub">Eng ko‘p buyurtma qilinadigan mahsulotlar</div>
  </div>
</div>

<div class="grid" id="grid"></div>

<div class="cart">
  <div class="cartRow">
    <span class="cartCount" id="cartCount">🛒 Savat bo‘sh</span>
    <span class="cartTotal" id="cartTotal">0 UZS</span>
  </div>
  <button class="orderBtn" onclick="openCheckout()">✅ Buyurtma berish</button>
</div>

<div class="checkoutOverlay" id="checkoutOverlay">
  <div class="checkout">
    <h2>🧾 Buyurtmani yakunlash</h2>

    <div class="field">
      <label>📱 Telefon raqam</label>
      <input id="phone" placeholder="+998 90 123 45 67"/>
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
  burger:"https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg",
  cheeseburger:"https://images.pexels.com/photos/2983101/pexels-photo-2983101.jpeg",
  cola:"https://images.pexels.com/photos/2775860/pexels-photo-2775860.jpeg",
  fries:"https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg",
  california:"https://images.pexels.com/photos/357756/pexels-photo-357756.jpeg",
  philadelphia:"https://images.pexels.com/photos/2098085/pexels-photo-2098085.jpeg",
  americano:"https://images.pexels.com/photos/374885/pexels-photo-374885.jpeg",
  latte:"https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg",
  cheesecake:"https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg"
};

function money(n){return Number(n||0).toLocaleString("ru-RU")+" UZS";}

function renderTabs(){
  const tabs=document.getElementById("tabs");
  tabs.innerHTML="";
  restaurantIds.forEach(id=>{
    const r=menus[id]||{};
    const btn=document.createElement("button");
    btn.className="tab"+(id===currentRestaurant?" active":"");
    btn.innerText=r.name||id;
    btn.onclick=()=>{currentRestaurant=id;renderTabs();renderMenu();};
    tabs.appendChild(btn);
  });
}

function getQty(key){
  return cart.filter(i=>i.key===key&&i.restaurantId===currentRestaurant).length;
}

function renderMenu(){
  const grid=document.getElementById("grid");
  const title=document.getElementById("sectionTitle");
  const search=(document.getElementById("search").value||"").toLowerCase();
  grid.innerHTML="";

  const restaurant=menus[currentRestaurant];
  if(!restaurant){
    grid.innerHTML='<div class="empty">Menu topilmadi</div>';
    return;
  }

  title.innerText=restaurant.name||"Menu";

  const entries=Object.entries(restaurant.menu||{}).filter(([key,item])=>{
    return (item.name||"").toLowerCase().includes(search);
  });

  if(!entries.length){
    grid.innerHTML='<div class="empty">Mahsulot topilmadi</div>';
    return;
  }

  entries.forEach(([key,item])=>{
    const qty=getQty(key);
    const card=document.createElement("div");
    card.className="card";
    card.innerHTML=\`
      <div class="cardTag">TOP</div>
      <img src="\${images[key]||images.burger}"/>
      <div class="cardBody">
        <div class="itemName">\${item.name||"Mahsulot"}</div>
        <div class="itemDesc">Yangi tayyorlanadi • tez yetkaziladi</div>
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
  const item=menus[currentRestaurant].menu[key];
  cart.push({key,restaurantId:currentRestaurant,name:item.name,price:Number(item.price||0)});
  renderCart();renderMenu();
}

function removeFromCart(key){
  const index=cart.findIndex(i=>i.key===key&&i.restaurantId===currentRestaurant);
  if(index>=0)cart.splice(index,1);
  renderCart();renderMenu();
}

function renderCart(){
  const total=cart.reduce((s,i)=>s+Number(i.price||0),0);
  document.getElementById("cartCount").innerText=cart.length?"🛒 "+cart.length+" ta mahsulot":"🛒 Savat bo‘sh";
  document.getElementById("cartTotal").innerText=money(total);
}

function autoDetectLocation(){
  if(!navigator.geolocation)return;
  document.getElementById("locationInfo").innerText="🎯 Lokatsiya aniqlanmoqda...";
  navigator.geolocation.getCurrentPosition(
    pos=>{
      userLocation={latitude:pos.coords.latitude,longitude:pos.coords.longitude};
      selectedLatLng={lat:pos.coords.latitude,lng:pos.coords.longitude};
      document.getElementById("locationInfo").innerText="✅ Lokatsiya aniqlandi";
      document.getElementById("address").value="📍 GPS orqali aniqlandi";
      if(map&&marker){
        marker.setLatLng([selectedLatLng.lat,selectedLatLng.lng]);
        map.setView([selectedLatLng.lat,selectedLatLng.lng],17);
      }
    },
    ()=>{document.getElementById("locationInfo").innerText="GPS ishlamadi, xaritadan tanlang";},
    {enableHighAccuracy:true,timeout:12000,maximumAge:0}
  );
}

function openCheckout(){
  if(!cart.length){alert("Savat bo‘sh");return;}
  document.getElementById("checkoutOverlay").style.display="flex";
  setTimeout(autoDetectLocation,500);
}

function closeCheckout(){document.getElementById("checkoutOverlay").style.display="none";}

function openMapPicker(){
  document.getElementById("mapOverlay").style.display="block";
  setTimeout(()=>{
    if(!map){
      map=L.map("map").setView(defaultCenter,14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(map);
      marker=L.marker(defaultCenter,{draggable:true}).addTo(map);
      selectedLatLng={lat:defaultCenter[0],lng:defaultCenter[1]};
      map.on("click",e=>{selectedLatLng=e.latlng;marker.setLatLng(e.latlng);document.getElementById("mapHint").innerText="✅ Lokatsiya tanlandi";});
      marker.on("dragend",()=>{selectedLatLng=marker.getLatLng();document.getElementById("mapHint").innerText="✅ Lokatsiya tanlandi";});
    }
    map.invalidateSize();
    if(selectedLatLng){
      map.setView([selectedLatLng.lat,selectedLatLng.lng],16);
      marker.setLatLng([selectedLatLng.lat,selectedLatLng.lng]);
    }
  },300);
}

function closeMapPicker(){document.getElementById("mapOverlay").style.display="none";}

function useGPS(){
  autoDetectLocation();
  setTimeout(()=>{
    if(selectedLatLng&&map&&marker){
      marker.setLatLng([selectedLatLng.lat,selectedLatLng.lng]);
      map.setView([selectedLatLng.lat,selectedLatLng.lng],17);
      document.getElementById("mapHint").innerText="✅ GPS orqali lokatsiya aniqlandi";
    }
  },1500);
}

function confirmMapLocation(){
  if(!selectedLatLng){alert("Xaritadan joy tanlang");return;}
  userLocation={latitude:selectedLatLng.lat,longitude:selectedLatLng.lng};
  document.getElementById("locationInfo").innerText="✅ Lokatsiya tanlandi";
  document.getElementById("address").value="🗺 Xaritadan lokatsiya tanlandi";
  closeMapPicker();
}

function sendOrder(){
  if(!cart.length){alert("Savat bo‘sh");return;}
  const phone=document.getElementById("phone").value.trim();
  const address=document.getElementById("address").value.trim();
  const paymentType=document.getElementById("payment").value;
  if(!phone){alert("Telefon raqam kiriting");return;}
  if(!address&&!userLocation){alert("Manzil kiriting yoki xaritadan lokatsiya tanlang");return;}

  const restaurantId=cart[0].restaurantId;
  const items=cart.filter(i=>i.restaurantId===restaurantId);
  const total=items.reduce((s,i)=>s+Number(i.price||0),0);

  const payload={type:"web_order_full",restaurantId,items,total,phone,address:address||"Xaritadan lokatsiya tanlandi",paymentType,location:userLocation};

  if(window.Telegram&&Telegram.WebApp){
    Telegram.WebApp.sendData(JSON.stringify(payload));
    Telegram.WebApp.close();
  }else{
    alert(JSON.stringify(payload));
  }
}

renderTabs();renderMenu();renderCart();

if(window.Telegram&&Telegram.WebApp){
  Telegram.WebApp.ready();
  Telegram.WebApp.expand();
  setTimeout(autoDetectLocation,1000);
}
</script>
</body>
</html>
`);
  });
}

module.exports = { menuRoutes };