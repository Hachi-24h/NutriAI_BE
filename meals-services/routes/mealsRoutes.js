const express = require("express");
const multer = require("multer");
const { analyzeMeal, getScannedMeals, saveScannedMeal } = require("../controllers/mealsController");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/analyze", upload.single("file"), analyzeMeal);
router.post("/save", saveScannedMeal);
router.get("/history", getScannedMeals);

module.exports = router; // ✅ dùng CommonJS export
