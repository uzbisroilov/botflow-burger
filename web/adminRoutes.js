const fs = require("fs-extra");
const path = require("path");

const ordersPath = path.join(__dirname, "../data/orders.json");

const USERS = {
  admin: {
    password: "admin123",
    role: "super",
    restaurantId: null,
    title: "Super Admin",
  },
  burger: {
    password: "burger123",
    role: "owner",
    restaurantId: "burger",
    title: "Burger Owner",
  },
  sushi: {
    password: "sushi123",
    role: "owner",
    restaurantId: "sushi",
    title: "Sushi Owner",
  },
  coffee: {
    password: "coffee123",
    role: "owner",
    restaurantId: "coffee",
    title: "Coffee Owner",
  },
};

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return header.split(";").reduce((acc, item) => {
    const [key, value] = item.trim().split("=");
    if (key) acc[key] = decodeURIComponent(value || "");
    return acc;
  }, {});
}

function getUserFromCookie(req) {
  const cookies = parseCookies(req);
  const username = cookies.botflow_user;
  const password = cookies.botflow_pass;

  if (!username || !password) return null;
  if (!USERS[username]) return null;
  if (USERS[username].password !== password) return null;

  return {
    username,
    ...USERS[username],
  };
}

function requireAuth(req, res) {
  const user = getUserFromCookie(req);

  if (!user) {
    res.redirect("/admin/login");
    return null;
  }

  return user;
}

async function readOrders() {
  try {
    if (!(await fs.pathExists(ordersPath))) {
      await fs.ensureDir(path.dirname(ordersPath));
      await fs.writeJson(ordersPath, [], { spaces: 2 });
      return [];
    }

    const data = await fs.readJson(ordersPath);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.log("Read orders error:", error.message);
    return [];
  }
}

async function writeOrders(orders) {
  await fs.ensureDir(path.dirname(ordersPath));
  await fs.writeJson(ordersPath, orders, { spaces: 2 });
}

function money(n) {
  return Number(n || 0).toLocaleString("ru-RU");
}

function restaurantTitle(id) {
  if (id === "burger") return "🍔 BotFlow Burger";
  if (id === "sushi") return "🍣 Sushi Master";
  if (id === "coffee") return "☕ Coffee Time";
  return "🏪 Restaurant";
}

function statusLabel(action) {
  if (action === "accepted") return "✅ Qabul qilindi";
  if (action === "cooking") return "👨‍🍳 Tayyorlanmoqda";
  if (action === "delivery") return "🚗 Yo‘lda";
  if (action === "delivered") return "🎉 Yetkazildi";
  if (action === "cancelled") return "❌ Bekor qilindi";
  return "📌 Status";
}

function clientMessage(action, orderId) {
  if (action === "accepted") {
    return `✅ Buyurtmangiz qabul qilindi

🏷 ${orderId}
👨‍🍳 Oshxona buyurtmani tayyorlashni boshlaydi.`;
  }

  if (action === "cooking") {
    return `👨‍🍳 Buyurtmangiz tayyorlanmoqda

🏷 ${orderId}
⏱ Taxminiy vaqt: 20–30 daqiqa`;
  }

  if (action === "delivery") {
    return `🚗 Buyurtmangiz yo‘lga chiqdi

🏷 ${orderId}
📍 Kuryer manzilingizga yetib bormoqda.`;
  }

  if (action === "delivered") {
    return `🎉 Buyurtmangiz yetkazildi

🏷 ${orderId}
Yoqimli ishtaha! BotFlow AI xizmatidan foydalanganingiz uchun rahmat.`;
  }

  if (action === "cancelled") {
    return `❌ Buyurtmangiz bekor qilindi

🏷 ${orderId}`;
  }

  return `📌 Buyurtmangiz holati yangilandi

🏷 ${orderId}`;
}

function statusColor(status = "") {
  if (status.includes("Qabul")) return "#2563eb";
  if (status.includes("Tayyor")) return "#f59e0b";
  if (status.includes("Yo‘lda")) return "#8b5cf6";
  if (status.includes("Yetkazildi")) return "#16a34a";
  if (status.includes("Bekor")) return "#ef4444";
  return "#111827";
}

function statusStep(status = "") {
  if (status.includes("Qabul")) return 25;
  if (status.includes("Tayyor")) return 50;
  if (status.includes("Yo‘lda")) return 75;
  if (status.includes("Yetkazildi")) return 100;
  if (status.includes("Bekor")) return 0;
  return 10;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderLogin(error = "") {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>BotFlow AI Login</title>

<style>
*{
  margin:0;
  padding:0;
  box-sizing:border-box;
  font-family:Inter,Arial,sans-serif;
}

body{
  min-height:100vh;
  background:
    radial-gradient(circle at top left, rgba(37,99,235,.28), transparent 35%),
    radial-gradient(circle at bottom right, rgba(22,163,74,.22), transparent 35%),
    linear-gradient(135deg,#0f172a,#111827);
  display:flex;
  align-items:center;
  justify-content:center;
  padding:20px;
}

.login-card{
  width:100%;
  max-width:430px;
  background:rgba(255,255,255,.96);
  border-radius:34px;
  padding:32px;
  box-shadow:0 30px 80px rgba(0,0,0,.32);
}

.logo{
  width:64px;
  height:64px;
  border-radius:22px;
  background:linear-gradient(135deg,#2563eb,#16a34a);
  color:white;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:30px;
  margin-bottom:18px;
}

h1{
  font-size:32px;
  font-weight:950;
  color:#111827;
}

p{
  color:#64748b;
  margin-top:8px;
  line-height:1.45;
  font-weight:600;
}

.form{
  margin-top:26px;
}

.field{
  margin-bottom:15px;
}

label{
  display:block;
  font-size:14px;
  font-weight:900;
  color:#111827;
  margin-bottom:8px;
}

input{
  width:100%;
  border:1px solid #e5e7eb;
  background:#f8fafc;
  border-radius:18px;
  padding:16px;
  font-size:16px;
  outline:none;
  font-weight:700;
}

input:focus{
  border-color:#2563eb;
  box-shadow:0 0 0 4px rgba(37,99,235,.12);
}

button{
  width:100%;
  border:0;
  border-radius:20px;
  padding:17px;
  margin-top:8px;
  background:linear-gradient(135deg,#2563eb,#1d4ed8);
  color:white;
  font-size:17px;
  font-weight:950;
  cursor:pointer;
  box-shadow:0 15px 30px rgba(37,99,235,.28);
}

.error{
  margin-top:16px;
  background:#fee2e2;
  color:#991b1b;
  padding:13px;
  border-radius:16px;
  font-weight:800;
  display:${error ? "block" : "none"};
}

.accounts{
  margin-top:22px;
  background:#f8fafc;
  border-radius:20px;
  padding:15px;
  color:#64748b;
  font-size:13px;
  line-height:1.7;
}

.accounts b{
  color:#111827;
}
</style>
</head>

<body>
  <div class="login-card">
    <div class="logo">🚀</div>

    <h1>BotFlow AI</h1>
    <p>Professional restaurant dashboardga kirish.</p>

    <form class="form" method="POST" action="/admin/login">
      <div class="field">
        <label>Login</label>
        <input name="username" placeholder="admin / burger / sushi / coffee" required />
      </div>

      <div class="field">
        <label>Parol</label>
        <input name="password" type="password" placeholder="Parolni kiriting" required />
      </div>

      <button type="submit">Dashboardga kirish</button>
    </form>

    <div class="error">${escapeHtml(error)}</div>

    <div class="accounts">
      <b>Demo loginlar:</b><br/>
      admin / admin123<br/>
      burger / burger123<br/>
      sushi / sushi123<br/>
      coffee / coffee123
    </div>
  </div>
</body>
</html>
`;
}

function renderDashboard({ orders, user }) {
  const mode = user.role;
  const restaurantId = user.restaurantId;

  const title =
    mode === "super"
      ? "🚀 BotFlow AI Super Admin"
      : `${restaurantTitle(restaurantId)} Owner Panel`;

  const subtitle =
    mode === "super"
      ? "Barcha restoranlar uchun professional boshqaruv paneli"
      : "Faqat shu restoranga tegishli buyurtmalar";

  const today = new Date().toISOString().slice(0, 10);

  const revenue = orders
    .filter((o) => (o.status || "").includes("Yetkazildi"))
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  const todayOrders = orders.filter((o) => (o.createdAt || "").startsWith(today));

  const activeOrders = orders.filter(
    (o) =>
      !(o.status || "").includes("Yetkazildi") &&
      !(o.status || "").includes("Bekor")
  );

  const deliveredOrders = orders.filter((o) =>
    (o.status || "").includes("Yetkazildi")
  );

  const latestOrders = [...orders].reverse();

  const orderCards = latestOrders
    .map((order) => {
      const mapLink =
        order.location && order.location.latitude && order.location.longitude
          ? `https://maps.google.com/?q=${order.location.latitude},${order.location.longitude}`
          : "";

      const status = order.status || "🆕 Yangi";
      const progress = statusStep(status);

      return `
        <div class="order-card" id="card-${escapeHtml(order.orderId)}">
          <div class="order-head">
            <div>
              <div class="order-id">${escapeHtml(order.orderId)}</div>
              <div class="restaurant-name">${escapeHtml(order.restaurant || "-")}</div>
            </div>

            <div class="status-badge" id="status-${escapeHtml(order.orderId)}" style="background:${statusColor(status)}">
              ${escapeHtml(status)}
            </div>
          </div>

          <div class="progress-wrap">
            <div class="progress-line">
              <div class="progress-fill" id="progress-${escapeHtml(order.orderId)}" style="width:${progress}%"></div>
            </div>
            <div class="progress-steps">
              <span>Qabul</span>
              <span>Tayyor</span>
              <span>Yo‘lda</span>
              <span>Finish</span>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <span>👤 Mijoz</span>
              <b>${escapeHtml(order.customer || "-")}</b>
            </div>

            <div class="info-box">
              <span>📞 Telefon</span>
              <b>${escapeHtml(order.phone || "-")}</b>
            </div>

            <div class="info-box">
              <span>📍 Manzil</span>
              <b>${escapeHtml(order.address || "-")}</b>
            </div>

            <div class="info-box">
              <span>💳 To‘lov</span>
              <b>${escapeHtml(order.paymentName || "-")}</b>
            </div>
          </div>

          <div class="items-box">
            <div class="items-title">🍽 Mahsulotlar</div>

            ${(order.items || [])
              .map(
                (item) => `
                  <div class="item-row">
                    <span>${escapeHtml(item.name || "-")}</span>
                    <b>${money(item.price)} so‘m</b>
                  </div>
                `
              )
              .join("")}

            <div class="total-row">
              <span>Jami</span>
              <b>${money(order.total)} so‘m</b>
            </div>
          </div>

          ${
            mapLink
              ? `
                <a href="${mapLink}" target="_blank">
                  <button class="map-btn">🗺 Google Maps ochish</button>
                </a>
              `
              : ""
          }

          <div class="actions">
            <button class="btn accept" onclick="setStatus('${escapeHtml(order.orderId)}','accepted')">✅ Qabul</button>
            <button class="btn cooking" onclick="setStatus('${escapeHtml(order.orderId)}','cooking')">👨‍🍳 Tayyorlanmoqda</button>
            <button class="btn delivery" onclick="setStatus('${escapeHtml(order.orderId)}','delivery')">🚗 Yo‘lda</button>
            <button class="btn delivered" onclick="setStatus('${escapeHtml(order.orderId)}','delivered')">🎉 Yetkazildi</button>
            <button class="btn cancel" onclick="setStatus('${escapeHtml(order.orderId)}','cancelled')">❌ Bekor qilish</button>
          </div>
        </div>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>BotFlow AI Admin</title>

<style>
*{
  margin:0;
  padding:0;
  box-sizing:border-box;
  font-family:Inter,Arial,sans-serif;
}

body{
  background:#f3f5f9;
  color:#111827;
  padding:22px;
}

.hero{
  background:linear-gradient(135deg,#0f172a,#1e293b);
  color:white;
  border-radius:34px;
  padding:30px;
  margin-bottom:24px;
  box-shadow:0 18px 42px rgba(15,23,42,.22);
}

.hero-top{
  display:flex;
  justify-content:space-between;
  gap:16px;
  align-items:center;
}

.title{
  font-size:34px;
  font-weight:950;
  letter-spacing:-.7px;
}

.subtitle{
  margin-top:8px;
  color:#cbd5e1;
  font-size:15px;
  font-weight:600;
}

.mode-badge{
  background:rgba(255,255,255,.12);
  border:1px solid rgba(255,255,255,.18);
  padding:10px 14px;
  border-radius:999px;
  font-weight:900;
  white-space:nowrap;
}

.nav{
  margin-top:22px;
  display:flex;
  flex-wrap:wrap;
  gap:10px;
}

.nav a{
  color:white;
  text-decoration:none;
  background:rgba(255,255,255,.12);
  padding:11px 15px;
  border-radius:999px;
  font-weight:900;
  font-size:14px;
}

.stats{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:14px;
  margin-bottom:26px;
}

.stat{
  background:white;
  border-radius:26px;
  padding:20px;
  box-shadow:0 12px 30px rgba(15,23,42,.08);
}

.stat span{
  display:block;
  color:#64748b;
  font-size:14px;
  font-weight:800;
}

.stat b{
  display:block;
  margin-top:10px;
  font-size:28px;
  font-weight:950;
}

.section-title{
  font-size:28px;
  font-weight:950;
  margin-bottom:18px;
}

.orders{
  display:flex;
  flex-direction:column;
  gap:20px;
}

.order-card{
  background:white;
  border-radius:32px;
  padding:22px;
  box-shadow:0 14px 34px rgba(15,23,42,.09);
}

.order-head{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:14px;
}

.order-id{
  font-size:23px;
  font-weight:950;
  letter-spacing:-.3px;
}

.restaurant-name{
  margin-top:4px;
  color:#64748b;
  font-weight:800;
}

.status-badge{
  color:white;
  padding:10px 15px;
  border-radius:999px;
  font-size:13px;
  font-weight:950;
  white-space:nowrap;
}

.progress-wrap{
  margin-top:18px;
  background:#f8fafc;
  border-radius:22px;
  padding:14px;
}

.progress-line{
  height:12px;
  background:#e5e7eb;
  border-radius:999px;
  overflow:hidden;
}

.progress-fill{
  height:100%;
  background:linear-gradient(90deg,#2563eb,#16a34a);
  border-radius:999px;
  transition:.25s;
}

.progress-steps{
  display:flex;
  justify-content:space-between;
  margin-top:9px;
  color:#64748b;
  font-size:12px;
  font-weight:900;
}

.info-grid{
  margin-top:18px;
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:12px;
}

.info-box{
  background:#f8fafc;
  border-radius:20px;
  padding:14px;
}

.info-box span{
  display:block;
  color:#64748b;
  font-size:13px;
  font-weight:800;
}

.info-box b{
  display:block;
  margin-top:6px;
  font-size:15px;
  word-break:break-word;
}

.items-box{
  margin-top:16px;
  background:#f8fafc;
  border-radius:24px;
  padding:16px;
}

.items-title{
  font-weight:950;
  margin-bottom:12px;
}

.item-row{
  display:flex;
  justify-content:space-between;
  gap:12px;
  margin-bottom:9px;
  font-size:15px;
}

.total-row{
  margin-top:14px;
  padding-top:14px;
  border-top:1px solid #dbe1e8;
  display:flex;
  justify-content:space-between;
  font-size:19px;
  font-weight:950;
}

.map-btn{
  margin-top:16px;
  width:100%;
  border:0;
  border-radius:20px;
  padding:16px;
  background:#111827;
  color:white;
  font-size:15px;
  font-weight:950;
  cursor:pointer;
}

.actions{
  margin-top:18px;
  display:grid;
  grid-template-columns:repeat(5,1fr);
  gap:10px;
}

.btn{
  border:0;
  border-radius:18px;
  padding:15px;
  color:white;
  font-size:14px;
  font-weight:950;
  cursor:pointer;
}

.accept{background:#2563eb}
.cooking{background:#f59e0b}
.delivery{background:#8b5cf6}
.delivered{background:#16a34a}
.cancel{background:#ef4444}

.empty{
  background:white;
  border-radius:28px;
  padding:46px;
  text-align:center;
  color:#64748b;
  font-weight:900;
}

.toast{
  position:fixed;
  left:50%;
  bottom:96px;
  transform:translateX(-50%);
  background:#111827;
  color:white;
  padding:15px 22px;
  border-radius:999px;
  display:none;
  z-index:100;
  font-weight:950;
  box-shadow:0 14px 30px rgba(15,23,42,.25);
}

.refresh{
  position:fixed;
  right:24px;
  bottom:24px;
  width:68px;
  height:68px;
  border:0;
  border-radius:50%;
  background:#2563eb;
  color:white;
  font-size:30px;
  font-weight:950;
  cursor:pointer;
  box-shadow:0 14px 30px rgba(37,99,235,.35);
}

@media(max-width:1000px){
  .stats{grid-template-columns:1fr 1fr}
  .info-grid{grid-template-columns:1fr 1fr}
  .actions{grid-template-columns:1fr 1fr}
  .cancel{grid-column:1/3}
}

@media(max-width:620px){
  body{padding:14px}
  .hero{padding:22px;border-radius:28px}
  .hero-top{align-items:flex-start;flex-direction:column}
  .title{font-size:28px}
  .stats{grid-template-columns:1fr 1fr}
  .stat b{font-size:23px}
  .info-grid{grid-template-columns:1fr}
  .order-head{flex-direction:column}
  .actions{grid-template-columns:1fr}
  .cancel{grid-column:auto}
}
</style>
</head>

<body>

<div class="hero">
  <div class="hero-top">
    <div>
      <div class="title">${title}</div>
      <div class="subtitle">${subtitle}</div>
    </div>

    <div class="mode-badge">
      ${mode === "super" ? "SUPER ADMIN" : "OWNER PANEL"} · ${escapeHtml(user.username)}
    </div>
  </div>

  <div class="nav">
    ${
      mode === "super"
        ? `<a href="/admin">Super Admin</a>
           <a href="/admin?as=burger">Burger Owner</a>
           <a href="/admin?as=sushi">Sushi Owner</a>
           <a href="/admin?as=coffee">Coffee Owner</a>`
        : `<a href="/admin">My Dashboard</a>`
    }
    <a href="/admin/logout">Logout</a>
  </div>
</div>

<div class="stats">
  <div class="stat"><span>💰 Revenue</span><b>${money(revenue)} so‘m</b></div>
  <div class="stat"><span>📦 Bugungi order</span><b>${todayOrders.length}</b></div>
  <div class="stat"><span>🚗 Aktiv order</span><b>${activeOrders.length}</b></div>
  <div class="stat"><span>🎉 Yetkazilgan</span><b>${deliveredOrders.length}</b></div>
</div>

<div class="section-title">🛒 Buyurtmalar</div>

<div class="orders">
  ${orderCards || `<div class="empty">Hozircha buyurtmalar yo‘q</div>`}
</div>

<div class="toast" id="toast">Status yangilandi</div>

<button class="refresh" onclick="location.reload()">↻</button>

<script>
function color(status){
  if(status.includes("Qabul")) return "#2563eb";
  if(status.includes("Tayyor")) return "#f59e0b";
  if(status.includes("Yo‘lda")) return "#8b5cf6";
  if(status.includes("Yetkazildi")) return "#16a34a";
  if(status.includes("Bekor")) return "#ef4444";
  return "#111827";
}

function progress(status){
  if(status.includes("Qabul")) return 25;
  if(status.includes("Tayyor")) return 50;
  if(status.includes("Yo‘lda")) return 75;
  if(status.includes("Yetkazildi")) return 100;
  if(status.includes("Bekor")) return 0;
  return 10;
}

function toast(text){
  const t = document.getElementById("toast");
  t.innerText = text;
  t.style.display = "block";
  setTimeout(() => {
    t.style.display = "none";
  }, 2200);
}

async function setStatus(orderId, action){
  try{
    const response = await fetch("/admin/order/" + orderId + "/status", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ action })
    });

    const data = await response.json();

    if(!data.ok){
      toast("Xatolik: " + (data.message || "status yangilanmadi"));
      return;
    }

    if(data.deleted){
      const card = document.getElementById("card-" + orderId);
      if(card) card.remove();
      toast("❌ Buyurtma bekor qilindi va paneldan o‘chirildi");
      return;
    }

    const badge = document.getElementById("status-" + orderId);
    const bar = document.getElementById("progress-" + orderId);

    badge.innerText = data.status;
    badge.style.background = color(data.status);

    if(bar){
      bar.style.width = progress(data.status) + "%";
    }

    toast("✅ Status yangilandi va mijozga yuborildi");
  }catch(error){
    console.log(error);
    toast("Server xatosi");
  }
}
</script>

</body>
</html>
`;
}

function adminRoutes(app, bot) {
  app.get("/admin/login", (req, res) => {
    const user = getUserFromCookie(req);
    if (user) return res.redirect("/admin");

    return res.send(renderLogin(""));
  });

  app.post("/admin/login", (req, res) => {
    const { username, password } = req.body || {};

    if (!username || !password || !USERS[username] || USERS[username].password !== password) {
      return res.send(renderLogin("Login yoki parol noto‘g‘ri"));
    }

    res.setHeader("Set-Cookie", [
      `botflow_user=${encodeURIComponent(username)}; Path=/; Max-Age=604800`,
      `botflow_pass=${encodeURIComponent(password)}; Path=/; Max-Age=604800`,
    ]);

    return res.redirect("/admin");
  });

  app.get("/admin/logout", (req, res) => {
    res.setHeader("Set-Cookie", [
      "botflow_user=; Path=/; Max-Age=0",
      "botflow_pass=; Path=/; Max-Age=0",
    ]);

    return res.redirect("/admin/login");
  });

  app.post("/admin/order/:orderId/status", async (req, res) => {
    try {
      const user = getUserFromCookie(req);

      if (!user) {
        return res.status(401).json({
          ok: false,
          message: "Login kerak",
        });
      }

      const { orderId } = req.params;
      const { action } = req.body;

      const orders = await readOrders();
      const order = orders.find((o) => o.orderId === orderId);

      if (!order) {
        return res.status(404).json({
          ok: false,
          message: "Order topilmadi",
        });
      }

      if (user.role === "owner" && order.restaurantId !== user.restaurantId) {
        return res.status(403).json({
          ok: false,
          message: "Bu order sizning restoraningizga tegishli emas",
        });
      }

      if (action === "cancelled") {
        const filteredOrders = orders.filter((o) => o.orderId !== orderId);
        await writeOrders(filteredOrders);

        if (bot && order.chatId) {
          await bot.sendMessage(order.chatId, clientMessage(action, orderId));
        }

        return res.json({
          ok: true,
          deleted: true,
        });
      }

      order.status = statusLabel(action);
      order.updatedAt = new Date().toISOString();

      await writeOrders(orders);

      if (bot && order.chatId) {
        await bot.sendMessage(order.chatId, clientMessage(action, orderId));
      }

      return res.json({
        ok: true,
        status: order.status,
      });
    } catch (error) {
      console.log("Status update error:", error.message);
      return res.status(500).json({
        ok: false,
        message: error.message,
      });
    }
  });

  app.get("/admin", async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;

    const allOrders = await readOrders();

    let orders = allOrders;

    if (user.role === "owner") {
      orders = allOrders.filter((order) => order.restaurantId === user.restaurantId);
    }

    if (user.role === "super" && req.query.as) {
      orders = allOrders.filter((order) => order.restaurantId === req.query.as);
    }

    return res.send(
      renderDashboard({
        orders,
        user,
      })
    );
  });
}

module.exports = { adminRoutes };