const express = require("express");
const multer = require("multer");
const {
  analyzeMeal,
  saveScannedMeal,
  getScannedMeals,
  getRecentScannedMeals,
} = require("../controllers/mealsScanController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/analyze", upload.single("file"), analyzeMeal);
router.post("/save", saveScannedMeal);
router.get("/history", getScannedMeals);
router.get("/recent", getRecentScannedMeals);

module.exports = router;
