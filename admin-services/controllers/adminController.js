const axios = require("axios");
require("dotenv").config();

const MEALS_URL = process.env.MEALS_SERVICE_URL;    
const SCHEDULE_URL = process.env.SCHEDULE_SERVICE_URL; 

// 🔹 Tổng quan hệ thống
exports.getOverview = async (req, res) => {
  try {
    const [scanRes, scheduleRes, topCompletedRes] = await Promise.all([
      axios.get(`${MEALS_URL}/scans`),
      axios.get(`${SCHEDULE_URL}/schedules`),
      axios.get(`${SCHEDULE_URL}/top-completed`) // endpoint mới
    ]);

    // Lấy userId của top user hoàn thành nhiều mục tiêu
    const topUser = topCompletedRes.data[0];

    let userInfo = null;
    if (topUser?._id) {
      try {
        const userRes = await axios.get(`${process.env.AUTH_SERVICE_URL}/${topUser._id}`);
        userInfo = userRes.data;
      } catch (e) {
        console.warn("⚠️ Không lấy được thông tin user:", e.message);
      }
    }

    res.json({
      scans: scanRes.data,
      schedules: scheduleRes.data,
      topUserCompleted: {
        ...topUser,
        userInfo,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Get overview stats failed",
      error: err.message,
    });
  }
};

// 🔹 Top người dùng scan nhiều nhất
exports.getTopScanners = async (req, res) => {
  try {
    // Lấy top user scan nhiều nhất trong tháng
    const topUsers = await axios.get(`${MEALS_URL}/top-users`);
    const users = topUsers.data; // [{ _id: "userId", totalScans: 12 }, ...]

    // Gọi sang Auth-service để lấy thông tin từng user
    const detailedUsers = await Promise.all(
      users.map(async (u) => {
        try {
          const userRes = await axios.get(`${process.env.AUTH_SERVICE_URL}/${u._id}`);
          return {
            ...u,
            userInfo: userRes.data, // thông tin từ Auth
          };
        } catch {
          return { ...u, userInfo: null };
        }
      })
    );

    res.json(detailedUsers);
  } catch (err) {
    console.error("❌ Get top scanners failed:", err.message);
    res.status(500).json({
      message: "Get top scanners failed",
      error: err.message,
    });
  }
};

// 🔹 Xu hướng scan 7 ngày
exports.getScanTrend = async (req, res) => {
  try {
    const response = await axios.get(`${MEALS_URL}/trend`);
    res.json(response.data);
  } catch (err) {
    console.error("❌ Get scan trend failed:", err.message);
    res.status(500).json({ message: "Get scan trend failed", error: err.message });
  }
};

// 🔹 Thống kê trạng thái kế hoạch
exports.getScheduleStatusStats = async (req, res) => {
  try {
    const response = await axios.get(`${SCHEDULE_URL}/status`);
    res.json(response.data);
  } catch (err) {
    console.error("❌ Get schedule status stats failed:", err.message);
    res.status(500).json({ message: "Get schedule status stats failed", error: err.message });
  }
};
