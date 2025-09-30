import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";

import { cuarnos } from "./utils/cuarnos.js";
import { parseUserInfo } from "./utils/parseUserInfo.js";
import { calculateNutritionNeeds } from "./utils/nutritionCalculator.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

/**
 * API: Sinh meal plan 7 ngày
 */
app.post("/generate-plan", async (req, res) => {
  try {
    // Chuẩn hóa input từ client
    const userInfo = parseUserInfo(req.body);

    // Tính nhu cầu dinh dưỡng từ input
    const nutritionNeeds = calculateNutritionNeeds(userInfo);

    // Gọi AI sinh meal plan
    const mealPlan = await cuarnos(userInfo, nutritionNeeds);

    res.json(mealPlan);
  } catch (err) {
    console.error("❌ Lỗi /generate-plan:", err);
    res.status(500).json({ error: "Không thể tạo meal plan" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ AI service running on http://localhost:${PORT}`);
});
