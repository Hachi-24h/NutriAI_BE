// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/adminController');
const adminStatsCtrl = require('../controllers/requestStatsController');
router.post('/createAD', adminCtrl.createAdmin);
router.get('/getAllAD', adminCtrl.getAllAdmins);

// 🟢 Ghi nhận request mới
router.post("/increment", adminStatsCtrl.incrementRequestCount);

// 📊 Lấy thống kê trong ngày
router.get("/daily", adminStatsCtrl.getDailyStats);

// 📅 Lấy thống kê 7 ngày gần nhất
router.get("/weekly", adminStatsCtrl.getWeeklyStats);

// 📊 Lấy thống kê tất cả dịch vụ
router.get("/stats-all-services", adminStatsCtrl.getAllServiceStats);

// 📊 Lấy thống kê từ log RequestStats
router.get("/stats-log", adminStatsCtrl.getRequestLogsStats);
module.exports = router;