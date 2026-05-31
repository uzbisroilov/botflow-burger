const fs = require("fs-extra");
const { restaurants } = require("../appconfig/restaurants");

const MENU_FILE = "./data/menus.json";

async function ensureMenuFile() {
  await fs.ensureDir("./data");

  if (!(await fs.pathExists(MENU_FILE))) {
    await fs.writeJson(MENU_FILE, restaurants, { spaces: 2 });
  }
}

async function getMenus() {
  await ensureMenuFile();
  return await fs.readJson(MENU_FILE);
}

async function getRestaurantById(restaurantId) {
  const menus = await getMenus();
  return menus[restaurantId] || null;
}

async function saveMenus(menus) {
  await fs.writeJson(MENU_FILE, menus, { spaces: 2 });
}

async function updateMenuItem(restaurantId, itemKey, name, price) {
  const menus = await getMenus();

  if (!menus[restaurantId]) return null;

  menus[restaurantId].menu[itemKey] = {
    name,
    price: Number(price),
  };

  await saveMenus(menus);

  return menus[restaurantId];
}

async function deleteMenuItem(restaurantId, itemKey) {
  const menus = await getMenus();

  if (!menus[restaurantId]) return null;

  delete menus[restaurantId].menu[itemKey];

  await saveMenus(menus);

  return menus[restaurantId];
}

module.exports = {
  getMenus,
  getRestaurantById,
  updateMenuItem,
  deleteMenuItem,
};