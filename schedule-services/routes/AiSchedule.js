const express = require("express");
const { generateNutrition, generateMealPlan, generatePlan2Step } = require("../controllers/AiSchedules");

const router = express.Router();

router.get("/", (req, res) => {
  res.send("🚀 AI MealPlan API Routes Working!");
});

router.post("/generate-nutrition", generateNutrition);
router.post("/generate-meal-plan", generateMealPlan);
router.post("/generate-plan-2step", generatePlan2Step);

module.exports = router;
