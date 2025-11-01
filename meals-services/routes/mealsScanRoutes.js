const express = require("express");
const multer = require("multer");
const {
  analyzeMeal,
  getScannedMeals,
  saveScannedMeal,
  getRecentScannedMeals,
} = require("../controllers/mealsScanController");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/analyze", upload.single("file"), analyzeMeal);
router.post("/save", saveScannedMeal);
router.get("/history", getScannedMeals);
router.get("/recent", getRecentScannedMeals); 

module.exports = router;