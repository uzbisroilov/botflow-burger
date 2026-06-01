const fs = require("fs-extra");

const FILE = "./data/food-images.json";

async function ensureFile() {
  await fs.ensureDir("./data");

  if (!(await fs.pathExists(FILE))) {
    await fs.writeJson(FILE, {}, { spaces: 2 });
  }
}

async function getImages() {
  await ensureFile();
  return await fs.readJson(FILE);
}

async function saveImage(itemKey, url) {
  const data = await getImages();

  data[itemKey] = url;

  await fs.writeJson(FILE, data, {
    spaces: 2,
  });
}

async function getImage(itemKey) {
  const data = await getImages();
  return data[itemKey] || null;
}

module.exports = {
  saveImage,
  getImage,
  getImages,
};