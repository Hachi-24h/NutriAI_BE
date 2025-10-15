// routes/mealRoutes.js
import express from "express";
import {
  generateNutrition,
  generateMealPlan,
  generatePlan2Step
} from "../controllers/mealController.js";

const router = express.Router();

// Health check
router.get("/", (req, res) => {
  res.send("🚀 AI MealPlan API Routes Working!");
});

// Route definitions
router.post("/generate-nutrition", generateNutrition);
router.post("/generate-meal-plan", generateMealPlan);
router.post("/generate-plan-2step", generatePlan2Step);

export default router;
