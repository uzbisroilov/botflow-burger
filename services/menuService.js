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

async function saveMenus(menus) {
  await fs.writeJson(MENU_FILE, menus, { spaces: 2 });
}

async function updateMenuItem(restaurantId, itemKey, name, price) {
  const menus = await getMenus();

  menus[restaurantId].menu[itemKey] = {
    name,
    price: Number(price),
  };

  await saveMenus(menus);
}

async function deleteMenuItem(restaurantId, itemKey) {
  const menus = await getMenus();

  delete menus[restaurantId].menu[itemKey];

  await saveMenus(menus);
}

module.exports = {
  getMenus,
  updateMenuItem,
  deleteMenuItem,
};