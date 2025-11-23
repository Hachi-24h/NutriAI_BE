const NodeCache = require("node-cache");
const { searchFoods, getFoodDetail, getFeaturedFoods } = require("../services/localFoodService");

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