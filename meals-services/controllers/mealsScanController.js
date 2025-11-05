const ScannedMeal = require("../models/scannedMeal");
const { predictFood } = require("../services/foodAI");
const cloudinary = require("../config/cloudinary");

// 📸 Phân tích món ăn
const analyzeMeal = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No image uploaded" });

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "scanned_meals" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    const result = await predictFood(uploadResult.secure_url);
    if (!result) return res.status(500).json({ message: "AI failed to predict" });

    res.json({
      food_en: result.name_en,
      food_vi: result.name_vi,
      confidence: result.confidence,
      nutrition: result.nutrition,
      example: result.example,
      image_url: uploadResult.secure_url,
    });
  } catch (error) {
    console.error("❌ analyzeMeal error:", error);
    res.status(500).json({ message: error.message });
  }
};

// 💾 Lưu món ăn theo userId
const saveScannedMeal = async (req, res) => {
  try {
    const { userId, food_en, food_vi, image_url, nutrition, confidence, mealType } = req.body;

    if (!userId || !food_en || !image_url) {
      return res.status(400).json({ message: "Missing required fields (userId, food_en, image_url)" });
    }

    const saved = await ScannedMeal.create({
      userId,
      food_en,
      food_vi,
      image_url,
      nutrition,
      confidence,
      mealType: mealType || "OTHER",
    });

    res.json({ message: "Meal saved successfully", saved });
  } catch (error) {
    console.error("❌ saveScannedMeal error:", error);
    res.status(500).json({ message: error.message });
  }
};

// 📜 Lấy danh sách món ăn của user
const getScannedMeals = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: "Missing userId" });

    const meals = await ScannedMeal.find({ userId }).sort({ createdAt: -1 });
    res.json(meals);
  } catch (error) {
    console.error("❌ getScannedMeals error:", error);
    res.status(500).json({ message: error.message });
  }
};

// 📜 Lấy 3 món gần nhất của user
const getRecentScannedMeals = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: "Missing userId" });

    const meals = await ScannedMeal.find({ userId }, "food_vi createdAt nutrition image_url")
      .sort({ createdAt: -1 })
      .limit(3);

    const formatted = meals.map((m) => ({
      name: m.food_vi,
      time: m.createdAt,
      nutrition: m.nutrition,
      image_url: m.image_url,
    }));

    res.json({ message: "Lấy 3 món gần nhất thành công ✅", meals: formatted });
  } catch (error) {
    console.error("❌ getRecentScannedMeals error:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  analyzeMeal,
  saveScannedMeal,
  getScannedMeals,
  getRecentScannedMeals,
};
