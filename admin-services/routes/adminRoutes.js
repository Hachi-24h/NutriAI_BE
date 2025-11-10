// routes/adminStatsRoutes.js
const express = require("express");
const router = express.Router();
const statsCtrl = require("../controllers/adminController");

router.get("/overview", statsCtrl.getOverview);
router.get("/top-users", statsCtrl.getTopScanners);
router.get("/scans/trend", statsCtrl.getScanTrend);
router.get("/schedules/status", statsCtrl.getScheduleStatusStats);

module.exports = router;
