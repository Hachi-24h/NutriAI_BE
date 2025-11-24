const express = require("express");
const router = express.Router();
const Schedule = require("../models/Schedule");

// Thống kê số kế hoạch
router.get("/schedules", async (req, res) => {
  try {
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const stats = {
      month: await Schedule.countDocuments({ createdAt: { $gte: oneMonthAgo } }),
      twoMonth: await Schedule.countDocuments({ createdAt: { $gte: twoMonthsAgo } }),
      total: await Schedule.countDocuments(),
    };

    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Thống kê trạng thái kế hoạch
router.get("/status", async (req, res) => {
  try {
    const result = await Schedule.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🔹 Thêm mới: Top user hoàn thành kế hoạch
router.get("/top-completed", async (req, res) => {
  try {
    const topUsers = await Schedule.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: "$userId", totalCompleted: { $sum: 1 } } },
      { $sort: { totalCompleted: -1 } },
      { $limit: 5 },
    ]);
    res.json(topUsers);
  } catch (err) {
    res.status(500).json({ message: "Get top completed failed", error: err.message });
  }
});

module.exports = router;
