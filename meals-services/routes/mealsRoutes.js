// routes/mealsRoutes.js
const express = require("express");
const multer = require("multer");
const router = express.Router();
const upload = multer({ dest: "uploads/" });

const { scanMeal, getMealsByDate } = require("../controllers/mealsController");
const requireAuth = require("../middlewares/requireAuth");

// 👇 POST /meals/scan
router.post("/scan", requireAuth, upload.single("image"), scanMeal);

// 👇 GET /meals/:dateID
router.get("/:dateID", requireAuth, getMealsByDate);

module.exports = router;
