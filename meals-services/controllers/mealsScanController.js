import ScannedMeal from "../models/scannedMeal.js";
import { predictFood } from "../services/foodAI.js";
import path from "path";

export const analyzeMeal = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No image uploaded" });

    const result = await predictFood(req.file.path);
    if (!result) return res.status(500).json({ message: "AI failed to predict" });

    const imagePath = `/uploads/${path.basename(req.file.path)}`;

    res.json({
      food_en: result.name_en,
      food_vi: result.name_vi,
      confidence: result.confidence,
      nutrition: result.nutrition,
      example: result.example,
      image_url: imagePath, // chỉ trả về ảnh để FE hiển thị
    });
  } catch (error) {
    console.error("❌ Analyze error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

export const saveScannedMeal = async (req, res) => {
  try {
    const { food_en, food_vi, image_url, nutrition, confidence, mealType } = req.body;

    if (!food_en || !image_url)
      return res.status(400).json({ message: "Missing required fields" });

    const saved = await ScannedMeal.create({
      food_en,
      food_vi,
      image_url,
      nutrition,
      confidence,
      mealType: mealType || "OTHER",
    });

    res.json({ message: "Meal saved successfully", saved });
  } catch (error) {
    console.error("❌ Save meal error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// 📜 Lấy danh sách món đã scan
export const getScannedMeals = async (req, res) => {
  try {
    const meals = await ScannedMeal.find().sort({ createdAt: -1 });
    res.json(meals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
