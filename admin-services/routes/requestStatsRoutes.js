const express = require("express");
const {
  incrementRequestCount,
  getDailyStats,
  getWeeklyStats
} = require("../controllers/requestStatsController");

const router = express.Router();

// 🟢 Ghi nhận request mới
router.post("/increment", incrementRequestCount);

// 📊 Lấy thống kê trong ngày
router.get("/daily", getDailyStats);

// 📅 Lấy thống kê 7 ngày gần nhất
router.get("/weekly", getWeeklyStats);

module.exports = router;
