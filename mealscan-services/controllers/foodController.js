const NodeCache = require("node-cache");
const { searchFoods, getFoodDetail, getFeaturedFoods } = require("../services/localFoodService");
const OpenAI = require("openai");

const aiCache = new NodeCache({ stdTTL: 86400 });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// Cache 1h cho featured
const featuredCache = new NodeCache({ stdTTL: 3600 });

// ====================================================================
// 🧩 Search foods — /foods/search?query=phở
// ====================================================================
exports.searchFoodList = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ message: "Missing query" });

    const results = searchFoods(query);
    if (!results.length)
      return res.status(404).json({ message: "No foods found" });

    res.json(results);
  } catch (error) {
    console.error("❌ searchFoodList error:", error.message);
    res.status(500).json({ message: "Failed to search foods" });
  }
};

// ====================================================================
// 🧠 Get food detail — /foods/detail?query=phở bò
// ====================================================================
exports.getFoodDetail = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ message: "Missing query" });

    const food = getFoodDetail(query);
    if (!food)
      return res.status(404).json({ message: "Food not found" });

    res.json(food);
  } catch (error) {
    console.error("❌ getFoodDetail error:", error.message);
    res.status(500).json({ message: "Failed to get food detail" });
  }
};

// ====================================================================
// 🍽️ Featured foods — /foods/featured?random=true
// ====================================================================
exports.getFeaturedFoods = async (req, res) => {
  try {
    const { random } = req.query;
    const cacheKey = random ? "featured_random" : "featured_static";
    const cached = featuredCache.get(cacheKey);
    if (cached) return res.json(cached);

    const foods = getFeaturedFoods(12);
    featuredCache.set(cacheKey, foods);

    res.json(foods);
  } catch (error) {
    console.error("❌ getFeaturedFoods error:", error.message);
    res.status(500).json({ message: "Failed to fetch featured foods" });
  }
};

exports.getRandomFoods = async (req, res) => {
  try {
    // Lấy số lượng từ query ?limit=30 (mặc định 30)
    const limit = parseInt(req.query.limit) || 30;

    // Lấy toàn bộ foods
    const allFoods = getFeaturedFoods(9999); // tạm dùng hàm load toàn bộ từ localFoodService

    // Shuffle ngẫu nhiên
    const shuffled = allFoods.sort(() => 0.5 - Math.random());

    // Cắt 30 phần tử đầu
    const randomFoods = shuffled.slice(0, limit);

    res.json(randomFoods);
  } catch (error) {
    console.error("❌ getRandomFoods error:", error.message);
    res.status(500).json({ message: "Failed to fetch random foods" });
  }
};

exports.analyzeFoodsBatch = async (req, res) => {
  try {
    const { medicalConditions, foods } = req.body;

    if (!medicalConditions?.length || !foods?.length) {
      return res.status(400).json({ message: "Missing data" });
    }

    const results = [];
    const foodsToAnalyze = [];

    // 1️⃣ Check cache trước
    for (const food of foods) {
      const key = JSON.stringify({
        diseases: medicalConditions.sort(),
        food: food.name,
        nutrition: food.nutrition,
      });

      const cached = aiCache.get(key);
      if (cached) {
        results.push({ foodName: food.name, ...cached, source: "cache" });
      } else {
        foodsToAnalyze.push({ food, key });
      }
    }

    // 2️⃣ Nếu tất cả đều cache
    if (!foodsToAnalyze.length) {
      return res.json(results);
    }

    // 3️⃣ PROMPT BATCH
    const prompt = `
You are a clinical nutrition assistant.

User medical conditions:
${medicalConditions.join(", ")}

Analyze the following foods.

Return JSON ONLY as array:
[
  {
    "foodName": string,
    "isSafe": boolean,
    "riskLevel": "LOW" | "MEDIUM" | "HIGH",
    "reason": string
  }
]

Foods:
${foodsToAnalyze
  .map(
    (f) => `
Food: ${f.food.name}
Calories: ${f.food.nutrition.calories}
Protein: ${f.food.nutrition.protein}
Carbs: ${f.food.nutrition.carbs}
Fat: ${f.food.nutrition.fat}
`
  )
  .join("\n")}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const parsed = JSON.parse(completion.choices[0].message.content);

    // 4️⃣ Save cache + merge result
    parsed.forEach((r) => {
      const target = foodsToAnalyze.find(f => f.food.name === r.foodName);
      if (target) {
        aiCache.set(target.key, r);
        results.push({ ...r, source: "ai" });
      }
    });

    res.json(results);
  } catch (e) {
    console.error("AI batch error:", e.message);
    res.status(500).json({ message: "AI batch analyze failed" });
  }
};