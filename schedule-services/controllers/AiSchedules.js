// controllers/mealController.js
const { parseUserInfo } = require("../utils/parseUserInfo");
const { getNutritionAI } = require("../utils/getNutritionAI");
const { generateMealPlanAI } = require("../utils/generateMealPlanAI");
const { analyzeUserScheduleAI } = require("../utils/analyzeUserScheduleAI.cjs");

/**
 * ✅ Bước 1 — chỉ tính nutrition (AI phân tích mục tiêu + thời gian + bệnh lý)
 */
 const generateNutrition = async (req, res) => {
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
 const generateMealPlan = async (req, res) => {
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
 const generatePlan2Step = async (req, res) => {
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

/*
  đưa lời khuyên lịch 
*/
const getAiAdvice = async (req, res) => { 
  try {
    const userInfo = { ...req.body.userInfo }; // giữ nguyên userId
    const userSchedule = req.body.userSchedule;

    const advice = await analyzeUserScheduleAI(userInfo, userSchedule);

    res.json({
      step: "advice-only",
      advice
    });
  } catch (err) {
    console.error("❌ Lỗi getAiAdvice:", err);
    res.status(500).json({ message: err.message || "AI không thể đưa lời khuyên" });
  }
};

module.exports = { generateNutrition, generateMealPlan, generatePlan2Step ,getAiAdvice};