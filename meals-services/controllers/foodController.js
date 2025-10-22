// controllers/foodController.js
const axios = require("axios");
const { searchFoods, getFoodNutrition } = require("../services/nutritionixService");
const { TranslationServiceClient } = require("@google-cloud/translate").v3;
const NodeCache = require("node-cache");

const NUTRITIONIX_APP_ID = process.env.NUTRITIONIX_APP_ID;
const NUTRITIONIX_APP_KEY = process.env.NUTRITIONIX_APP_KEY;
const PROJECT_ID = process.env.PROJECT_ID;

const client = new TranslationServiceClient();
const translateCache = new NodeCache({ stdTTL: 86400 }); // 1 ngày
const featuredCache = new NodeCache({ stdTTL: 3600 }); // 1h

// ===========================================================
// 🔠 TRANSLATE HELPERS
// ===========================================================
async function translateToVietnamese(text) {
  if (translateCache.has(text)) return translateCache.get(text);
  try {
    const [response] = await client.translateText({
      parent: `projects/${PROJECT_ID}/locations/global`,
      contents: [text],
      mimeType: "text/plain",
      sourceLanguageCode: "en",
      targetLanguageCode: "vi",
    });
    const translated = response.translations[0].translatedText;
    translateCache.set(text, translated);
    return translated;
  } catch (err) {
    console.warn("⚠️ Google Translate failed:", err.message);
    return text;
  }
}

async function translateToEnglish(text) {
  try {
    const [response] = await client.translateText({
      parent: `projects/${PROJECT_ID}/locations/global`,
      contents: [text],
      mimeType: "text/plain",
      sourceLanguageCode: "vi",
      targetLanguageCode: "en",
    });
    return response.translations[0].translatedText;
  } catch (err) {
    console.warn("⚠️ Query translation failed:", err.message);
    return text;
  }
}

// ===========================================================
// 🧠 CATEGORY DETECTOR
// ===========================================================
function detectCategory(foodName = "") {
  const name = foodName.toLowerCase();
  if (/(apple|banana|orange|grape|mango|fruit|watermelon)/.test(name)) return "fruit";
  if (/(chicken|beef|pork|fish|salmon|shrimp|egg|meat)/.test(name)) return "meat/protein";
  if (/(rice|bread|noodle|pasta|grain|cereal|oatmeal)/.test(name)) return "grain/carbohydrate";
  if (/(milk|cheese|yogurt)/.test(name)) return "dairy";
  if (/(broccoli|carrot|spinach|lettuce|vegetable|salad|tomato)/.test(name)) return "vegetable";
  if (/(juice|coffee|tea|water|soda|drink)/.test(name)) return "beverage";
  return "other";
}

// ===========================================================
// 🧩 Deduplicate Foods
// ===========================================================
function normalizeText(str = "") {
  return str
    .toLowerCase()
    .replace(/quả\s+/g, "") // bỏ từ "quả" trong tiếng Việt
    .replace(/[^a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function makeNutritionKey(f) {
  const c = Math.round(f.calories ?? 0);
  const p = Math.round((f.protein ?? 0) * 10);
  const fat = Math.round((f.fat ?? 0) * 10);
  const carb = Math.round((f.carbs ?? 0) * 10);
  return `${c}_${p}_${fat}_${carb}`;
}

function deduplicateFoods(foods) {
    const map = new Map();
  
    const simplify = (str = "") =>
      str
        .toLowerCase()
        .replace(/quả\s+/g, "")
        .replace(/[^a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
  
    const makeNutritionKey = (f) => {
      const c = Math.round(f.calories ?? 0);
      const p = Math.round((f.protein ?? 0) * 10);
      const fat = Math.round((f.fat ?? 0) * 10);
      const carb = Math.round((f.carbs ?? 0) * 10);
      return `${c}_${p}_${fat}_${carb}`;
    };
  
    const extractRoot = (name) => {
      // bỏ các từ mô tả phụ (raw, cooked, with, skin, slice...)
      return name
        .replace(/\b(raw|cooked|with|without|skin|slice|piece|boiled|baked|fresh|medium|large|small)\b/g, "")
        .trim()
        .split(" ")[0]; // lấy từ đầu tiên làm root
    };
  
    for (const f of foods) {
      if (!f) continue;
      const nameEn = simplify(f.name_en || "");
      const nameVi = simplify(f.name_vi || "");
      const nutriKey = makeNutritionKey(f);
      const root = extractRoot(nameEn);
      const key = `${root}_${nutriKey}`;
  
      if (map.has(key)) {
        const existing = map.get(key);
        // Nếu hai tên Việt gần giống nhau (“táo” và “quả táo”) thì bỏ trùng
        if (
          existing.name_vi &&
          nameVi &&
          (existing.name_vi.includes(nameVi) || nameVi.includes(existing.name_vi))
        ) {
          continue;
        }
        // Ưu tiên có ảnh hoặc brand
        const existingScore = (existing.photo ? 1 : 0) + (existing.brand ? 1 : 0);
        const currentScore = (f.photo ? 1 : 0) + (f.brand ? 1 : 0);
        if (currentScore > existingScore) map.set(key, f);
      } else {
        map.set(key, f);
      }
    }
  
    // Debug xem key nào bị trùng
    console.log("🧩 Deduplicated:", map.size, "/", foods.length, "foods");
  
    return Array.from(map.values());
  }
  
// ===========================================================
// [GET] /foods/search?query=chicken rice
// ===========================================================
exports.searchFoodList = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ message: "Missing query" });

    const translated = await translateToEnglish(query);
    console.log(`🌍 Query translated: "${query}" → "${translated}"`);

    const data = await searchFoods(translated);

    // gộp luôn common + branded lại trước khi xử lý
    const allFoods = [...data.common, ...data.branded];

    const results = await Promise.all(
      allFoods.map(async (f) => {
        const name_vi = await translateToVietnamese(f.food_name);
        let nutrition = null;
        try {
          const detail = await getFoodNutrition(f.food_name);
          nutrition = detail?.[0];
        } catch {}

        return {
          name_en: f.food_name,
          name_vi,
          brand: f.brand_name,
          photo: f.photo?.thumb,
          source: f.brand_name ? "Nutritionix Branded" : "Nutritionix Common",
          category: detectCategory(f.food_name),
          calories: nutrition?.nf_calories ?? f.nf_calories ?? null,
          protein: nutrition?.nf_protein ?? f.nf_protein ?? null,
          fat: nutrition?.nf_total_fat ?? f.nf_total_fat ?? null,
          carbs: nutrition?.nf_total_carbohydrate ?? f.nf_total_carbohydrate ?? null,
        };
      })
    );

    // 🔁 Lọc trùng theo nutrition + tên
    const merged = deduplicateFoods(results);

    res.json(merged);
  } catch (error) {
    console.error("❌ searchFoodList error:", error.message);
    res.status(500).json({ message: "Failed to fetch foods" });
  }
};

// ===========================================================
// [GET] /foods/detail?query=chicken rice
// ===========================================================
exports.getFoodDetail = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ message: "Missing query" });

    const translated = await translateToEnglish(query);
    console.log(`🌍 Detail translated: "${query}" → "${translated}"`);

    const foods = await getFoodNutrition(translated);
    if (!foods || foods.length === 0)
      return res.status(404).json({ message: "Food not found" });

    const item = foods[0];
    const name_vi = await translateToVietnamese(item.food_name);

    res.json({
      name_en: item.food_name,
      name_vi,
      calories: item.nf_calories ?? 0,
      protein: item.nf_protein ?? 0,
      fat: item.nf_total_fat ?? 0,
      carbs: item.nf_total_carbohydrate ?? 0,
      serving_unit: item.serving_unit,
      serving_weight_grams: item.serving_weight_grams,
      photo: item.photo?.thumb,
      category: detectCategory(item.food_name),
      source: "Nutritionix",
    });
  } catch (error) {
    console.error("❌ getFoodDetail error:", error.message);
    res.status(500).json({ message: "Failed to fetch food details" });
  }
};

// ===========================================================
// [GET] /foods/featured?random=true
// ===========================================================
const CATEGORY_KEYWORDS = {
  fruit: ["apple", "banana", "orange", "grape", "mango", "watermelon"],
  meat: ["chicken", "beef", "pork", "salmon", "shrimp", "egg"],
  vegetable: ["broccoli", "carrot", "spinach", "lettuce", "tomato"],
  grain: ["rice", "bread", "pasta", "noodle", "oatmeal"],
  dairy: ["milk", "yogurt", "cheese"],
  beverage: ["coffee", "tea", "juice", "soda", "water"],
};

function pickRandom(arr, n = 2) {
  return arr.sort(() => 0.5 - Math.random()).slice(0, n);
}

exports.getFeaturedFoods = async (req, res) => {
  try {
    const { random } = req.query;
    const cacheKey = random ? "featured_random" : "featured_static";
    const cached = featuredCache.get(cacheKey);
    if (cached) return res.json(cached);

    const results = [];

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      const picked = random ? pickRandom(keywords, 2) : keywords.slice(0, 2);
      for (const word of picked) {
        try {
          const foods = await getFoodNutrition(word);
          const f = foods?.[0];
          if (!f) continue;
          const name_vi = await translateToVietnamese(f.food_name);
          results.push({
            name_en: f.food_name,
            name_vi,
            category,
            photo: f.photo?.thumb,
            calories: f.nf_calories ?? null,
            protein: f.nf_protein ?? null,
            fat: f.nf_total_fat ?? null,
            carbs: f.nf_total_carbohydrate ?? null,
            source: "Nutritionix Featured",
          });
        } catch (err) {
          console.warn(`⚠️ Skip ${word}:`, err.message);
        }
      }
    }

    const uniqueResults = deduplicateFoods(results);
    featuredCache.set(cacheKey, uniqueResults);
    res.json(uniqueResults);
  } catch (err) {
    console.error("❌ getFeaturedFoods error:", err.message);
    res.status(500).json({ message: "Failed to fetch featured foods" });
  }
};
