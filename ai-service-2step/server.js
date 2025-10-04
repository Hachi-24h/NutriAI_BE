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
 * Health check
 */
app.get("/", (req, res) => {
  res.send("🚀 AI 2-step service running on http://localhost:" + PORT);
});

/**
 * API Step 1: chỉ tính nutrition
 */
app.post("/generate-nutrition", async (req, res) => {
  try {
    const userInfo = parseUserInfo(req.body);
    const nutrition = await getNutritionAI(userInfo);
    res.json(nutrition);
  } catch (err) {
    console.error("❌ Error /generate-nutrition:", err);
    res.status(500).json({ error: "AI không thể tính nutrition" });
  }
});

/**
 * API Step 2: Nutrition + MealPlan
 */
app.post("/generate-plan-2step", async (req, res) => {
  try {
    // Parse input
    const userInfo = parseUserInfo(req.body);

    // Step 1: Nutrition
    const nutrition = await getNutritionAI(userInfo);
    console.log("✅ Step 1 Nutrition:", nutrition);

    // Step 2: Meal Plan
    const mealPlan = await generateMealPlanAI(userInfo, nutrition);
    console.log("✅ Step 2 MealPlan:", mealPlan.schedule ? "OK" : "Fail");

    // Merge kết quả
    res.json({
      nutrition,
      mealPlan
    });
  } catch (err) {
    console.error("❌ Error /generate-plan-2step:", err);
    res.status(500).json({ error: "AI không thể tạo meal plan" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 AI 2-step service running on http://localhost:${PORT}`);
});
