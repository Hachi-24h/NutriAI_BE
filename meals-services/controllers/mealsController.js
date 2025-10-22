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

import MealDay from "../models/MealDay.js";
import MealTemplate from "../models/mealTemplate.js";

/**
 * Tạo template mới từ data mẫu (3 ngày hoặc nhiều hơn)
 */
export const createMealTemplate = async (req, res) => {
  try {
    const { name, description, createdBy, schedule } = req.body;

    if (!schedule || schedule.length === 0) {
      return res.status(400).json({ message: "schedule không được để trống" });
    }

    // 1️⃣ Lưu từng MealDay
    const mealDayIds = [];
    for (const day of schedule) {
      const mealDay = await MealDay.create({
        dateID: day.dateID,
        meals: day.meals,
        createdBy
      });
      mealDayIds.push(mealDay._id.toString());
    }

    // 2️⃣ Tạo MealTemplate
    const template = await MealTemplate.create({
      name,
      description,
      days: mealDayIds,
      createdBy
    });

    return res.status(201).json({
      message: "Tạo template thành công",
      template
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

/**
 * Lấy chi tiết template kèm các ngày ăn
 */
export const getMealTemplate = async (req, res) => {
  try {
    const template = await MealTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ message: "Không tìm thấy template" });

    const mealDays = await MealDay.find({ _id: { $in: template.days } });

    return res.json({ ...template.toObject(), days: mealDays });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
