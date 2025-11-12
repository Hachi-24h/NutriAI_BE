const RequestStats = require("../models/RequestStats");

// 🟢 Ghi nhận request mới (tăng count hoặc tạo mới)
const incrementRequestCount = async (req, res) => {
  try {
    const { service, api } = req.body;
    if (!service || !api) {
      return res.status(400).json({ message: "Thiếu service hoặc api" });
    }

    const date = new Date().toISOString().slice(0, 10); // yyyy-mm-dd

    await RequestStats.findOneAndUpdate(
      { service, api, date },
      { $inc: { count: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`✅ Ghi nhận request: [${service}] -- [${api}] -- [${date}]`);
    res.json({ success: true });
    
  } catch (err) {
    console.error("❌ incrementRequestCount error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// 📊 Lấy thống kê của ngày hiện tại
const getDailyStats = async (req, res) => {
  try {
    const date = new Date().toISOString().slice(0, 10);
    const stats = await RequestStats.find({ date }).sort({ count: -1 });

    res.json({
      date,
      totalApis: stats.length,
      stats
    });

  } catch (err) {
    console.error("❌ getDailyStats error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 📅 Lấy thống kê của 7 ngày gần nhất
const getWeeklyStats = async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const dateStart = sevenDaysAgo.toISOString().slice(0, 10);

    const stats = await RequestStats.find({ date: { $gte: dateStart } })
      .sort({ date: 1, service: 1 });

    res.json({
      from: dateStart,
      to: now.toISOString().slice(0, 10),
      totalRecords: stats.length,
      stats
    });
  } catch (err) {
    console.error("❌ getWeeklyStats error:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  incrementRequestCount,
  getDailyStats,
  getWeeklyStats
};
