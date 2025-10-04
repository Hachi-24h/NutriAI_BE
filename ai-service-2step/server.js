// server.js
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";

import { parseUserInfo } from "./utils/parseUserInfo.js";
import { getNutritionAI } from "./utils/getNutritionAI.js";
import { generateMealPlanAI } from "./utils/generateMealPlanAI.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

/**
 * ✅ Health check
 */
app.get("/", (req, res) => {
  res.send("🚀 AI MealPlan service running on http://localhost:" + PORT);
});

/**
 * ✅ API 1 — Bước 1: Chỉ tính nutrition (AI phân tích mục tiêu + thời gian + bệnh lý)
 */
app.post("/generate-nutrition", async (req, res) => {
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
});

/**
 * ✅ API 2 — Bước 2: Chỉ sinh meal plan (dựa vào nutrition có sẵn)
 * ⚠️ Yêu cầu: request body phải có cả userInfo và nutrition từ bước 1
 */
app.post("/generate-meal-plan", async (req, res) => {
  try {
    const { userInfo, nutrition } = req.body;
    if (!userInfo || !nutrition) {
      throw new Error("Thiếu userInfo hoặc nutrition từ bước 1.");
    }

    const mealPlan = await generateMealPlanAI(userInfo, nutrition);

   res.json(mealPlan); // chỉ trả ra schedule
  } catch (err) {
    console.error("❌ Error /generate-meal-plan:", err);
    res.status(500).json({ error: err.message || "AI không thể tạo meal plan" });
  }
});

/**
 * ✅ API 3 — 2 bước liên tục (AI tính dinh dưỡng → sinh meal plan)
 */
app.post("/generate-plan-2step", async (req, res) => {
  try {
    const userInfo = parseUserInfo(req.body);

    // Step 1: Nutrition
    const nutrition = await getNutritionAI(userInfo);
    console.log("✅ Step 1 Nutrition:", nutrition);

    // Step 2: Meal Plan
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
});

app.listen(PORT, () => {
  console.log(`🚀 AI MealPlan service running on http://localhost:${PORT}`);
});
