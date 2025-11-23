const fs = require("fs");
const path = require("path");

const dataPath = path.join(__dirname, "../data/foods.json");
const GCS_URL = "https://storage.googleapis.com/nutri-ai-foods/";

let FOODS_CACHE = [];

function loadFoods() {
  if (FOODS_CACHE.length > 0) return FOODS_CACHE;

  const lines = fs.readFileSync(dataPath, "utf-8").trim().split("\n");
  FOODS_CACHE = lines.map(line => {
    const f = JSON.parse(line);
    if (f.photo && !f.photo.startsWith("http")) {
      f.photo = GCS_URL + f.photo; // ✅ tự động thêm link GCS
    }
    return f;
  });

  return FOODS_CACHE;
}

function searchFoods(query) {
  const foods = loadFoods();
  const q = query.toLowerCase();
  return foods.filter(f =>
    f.name_vi.toLowerCase().includes(q) || f.name_en.toLowerCase().includes(q)
  );
}

function getFoodDetail(query) {
  const foods = loadFoods();
  const q = query.toLowerCase();
  return foods.find(f =>
    f.name_vi.toLowerCase() === q || f.name_en.toLowerCase() === q
  );
}

function getFeaturedFoods(count = 12) {
  const foods = loadFoods();
  return foods.sort(() => 0.5 - Math.random()).slice(0, count);
}

module.exports = { loadFoods, searchFoods, getFoodDetail, getFeaturedFoods };
