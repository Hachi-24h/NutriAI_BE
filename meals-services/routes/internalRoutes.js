const express = require("express");
const router = express.Router();
const ScannedMeal = require("../models/scannedMeal");

// Tổng quan
router.get("/scans", async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = {
      today: await ScannedMeal.countDocuments({ scannedAt: { $gte: oneDayAgo } }),
      week: await ScannedMeal.countDocuments({ scannedAt: { $gte: oneWeekAgo } }),
      month: await ScannedMeal.countDocuments({ scannedAt: { $gte: oneMonthAgo } }),
      total: await ScannedMeal.countDocuments(),
    };

    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Top user scan
router.get("/top-users", async (req, res) => {
  try {
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const topUsers = await ScannedMeal.aggregate([
      { $match: { scannedAt: { $gte: oneMonthAgo } } },
      { $group: { _id: "$userId", totalScans: { $sum: 1 } } },
      { $sort: { totalScans: -1 } },
      { $limit: 5 },
    ]);
    res.json(topUsers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Xu hướng 7 ngày
router.get("/trend", async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const trend = await ScannedMeal.aggregate([
      { $match: { scannedAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            day: { $dayOfMonth: "$scannedAt" },
            month: { $month: "$scannedAt" },
            year: { $year: "$scannedAt" },
          },
          totalScans: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);
    res.json(trend);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
