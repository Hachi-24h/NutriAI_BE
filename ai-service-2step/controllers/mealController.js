// controllers/mealController.js
import { parseUserInfo } from "../utils/parseUserInfo.js";
import { getNutritionAI } from "../utils/getNutritionAI.js";
import { generateMealPlanAI } from "../utils/generateMealPlanAI.js";

/**
 * ✅ Bước 1 — chỉ tính nutrition (AI phân tích mục tiêu + thời gian + bệnh lý)
 */
export const generateNutrition = async (req, res) => {
  try {
    const userInfo = parseUserInfo(req.body);
    const nutrition = await getNutritionAI(userInfo);

    res.json({
      step: "nutrition-only",
      nutrition
    });
  } catch (err) {
    console.error("❌ Error /generate-nutrition:", err);
    res.status(500).json({ error: err.message || "AI không thể tính dinh dưỡng" });
  }
};

/**
 * ✅ Bước 2 — chỉ sinh meal plan (dựa vào nutrition có sẵn)
 */
export const generateMealPlan = async (req, res) => {
  try {
    const { userInfo, nutrition } = req.body;
    if (!userInfo || !nutrition) {
      throw new Error("Thiếu userInfo hoặc nutrition từ bước 1.");
    }

    const mealPlan = await generateMealPlanAI(userInfo, nutrition);
    res.json(mealPlan);
  } catch (err) {
    console.error("❌ Error /generate-meal-plan:", err);
    res.status(500).json({ error: err.message || "AI không thể tạo meal plan" });
  }
};

/**
 * ✅ Bước 3 — chạy 2 bước liên tục (AI tính nutrition → meal plan)
 */
export const generatePlan2Step = async (req, res) => {
  try {
    const userInfo = parseUserInfo(req.body);

    const nutrition = await getNutritionAI(userInfo);
    console.log("✅ Step 1 Nutrition:", nutrition);

    const mealPlan = await generateMealPlanAI(userInfo, nutrition);
    console.log("✅ Step 2 MealPlan:", mealPlan.schedule ? "OK" : "Fail");

    res.json({
      step: "full-2step",
      userInfo,
      nutrition,
      mealPlan
    });
  } catch (err) {
    console.error("❌ Error /generate-plan-2step:", err);
    res.status(500).json({ error: err.message || "AI không thể tạo meal plan" });
  }
};
