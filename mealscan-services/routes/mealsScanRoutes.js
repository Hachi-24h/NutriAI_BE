const express = require("express");
const multer = require("multer");
const {
  analyzeMeal,
  saveScannedMeal,
  getScannedMeals,
  getRecentScannedMeals,
  getGlobalScanStatistics
} = require("../controllers/mealsScanController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/analyze", upload.single("file"), analyzeMeal);
router.post("/save", saveScannedMeal);
router.get("/history", getScannedMeals);
router.get("/recent", getRecentScannedMeals);
router.get("/stats", getGlobalScanStatistics);
module.exports = router;
