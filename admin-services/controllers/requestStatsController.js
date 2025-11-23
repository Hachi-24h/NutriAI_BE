const RequestStats = require("../models/RequestStats");
const config = require("../config/env");
const axios = require("axios");
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

/**
 * 📊 Lấy thống kê tổng hợp từ tất cả service và log chi tiết
 */
const getAllServiceStats = async (req, res) => {
  try {
    const baseUrls = {
      auth: config.AUTH_SERVICE_URL,
      user: config.USER_SERVICE_URL,
      schedule: config.SCHEDULE_SERVICE_URL,
      scheduleResult: config.SCHEDULE_RESULT_SERVICE_URL,
      meal: config.MEAL_SERVICE_URL,
      mealscan: config.MEAL_SCAN_SERVICE_URL,
     
    };

    console.log("🔍 Bắt đầu gọi song song tới các service...");

    const results = {};

    // Gọi song song tất cả services
    await Promise.all(
      Object.entries(baseUrls).map(async ([serviceName, url]) => {
        if (!url) {
          results[serviceName] = { error: "⚠️ Không có URL cấu hình cho service này." };
          console.warn(`⚠️ Bỏ qua service ${serviceName} - chưa có URL.`);
          return;
        }

        const fullUrl = `${url}/stats`;
        console.log(`➡️ Gọi tới [${serviceName}] - ${fullUrl} ...`);
        const start = Date.now();

        try {
          const { data, status } = await axios.get(fullUrl, { timeout: 8000 });
          const duration = Date.now() - start;
          console.log(`✅ [${serviceName}] - OK (${status}) - ${duration}ms`);
          results[serviceName] = {
            status: "success",
            duration: `${duration}ms`,
            data
          };
        } catch (err) {
          const duration = Date.now() - start;
          let reason = "Không rõ lỗi";

          if (err.code === "ECONNREFUSED") {
            reason = "Không thể kết nối tới service (ECONNREFUSED)";
          } else if (err.code === "ETIMEDOUT") {
            reason = "Service phản hồi quá lâu (timeout)";
          } else if (err.response?.status === 404) {
            reason = "API /stats không tồn tại (404)";
          } else if (err.response?.status >= 500) {
            reason = `Lỗi server nội bộ (${err.response.status})`;
          } else if (err.message.includes("ENOTFOUND")) {
            reason = "Sai đường dẫn hoặc domain không hợp lệ";
          } else {
            reason = err.message || "Lỗi không xác định";
          }

          console.error(`❌ [${serviceName}] - Thất bại sau ${duration}ms - ${reason}`);

          results[serviceName] = {
            status: "error",
            duration: `${duration}ms`,
            message: reason,
            raw: {
              code: err.code,
              status: err.response?.status || null,
              url: fullUrl
            }
          };
        }
      })
    );

    console.log("📦 Tổng hợp kết quả xong, gửi về client...");

    res.json({
      message: "✅ Tổng hợp thống kê từ các service hoàn tất",
      time: new Date().toISOString(),
      results
    });
  } catch (err) {
    console.error("💥 getAllServiceStats tổng lỗi:", err);
    res.status(500).json({
      message: "Lỗi khi lấy thống kê services",
      error: err.message
    });
  }
};


// =============================
// 📊 Thống kê từ log RequestStats
// =============================
const getRequestLogsStats = async (req, res) => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const monthStart = new Date(currentYear, now.getMonth(), 1);
    const monthStr = monthStart.toISOString().slice(0, 10);

    // Tính ngày bắt đầu của tuần (thứ 2)
    const weekStart = new Date(now);
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // CN = 7
    weekStart.setDate(now.getDate() - (dayOfWeek - 1));
    const weekStr = weekStart.toISOString().slice(0, 10);

    // --- 1️⃣ Tổng request hôm nay ---
    const todayAgg = await RequestStats.aggregate([
      { $match: { date: todayStr } },
      { $group: { _id: null, total: { $sum: "$count" } } }
    ]);
    const totalToday = todayAgg[0]?.total || 0;

    // --- 2️⃣ Tổng request tháng hiện tại ---
    const monthAgg = await RequestStats.aggregate([
      { $match: { date: { $gte: monthStr } } },
      { $group: { _id: null, total: { $sum: "$count" } } }
    ]);
    const totalThisMonth = monthAgg[0]?.total || 0;

    // --- 3️⃣ Thống kê theo service (ngày, tuần, tháng, trung bình) ---
    const servicesAgg = await RequestStats.aggregate([
      {
        $facet: {
          today: [
            { $match: { date: todayStr } },
            { $group: { _id: "$service", total: { $sum: "$count" } } }
          ],
          week: [
            { $match: { date: { $gte: weekStr } } },
            { $group: { _id: "$service", total: { $sum: "$count" } } }
          ],
          month: [
            { $match: { date: { $gte: monthStr } } },
            { $group: { _id: "$service", total: { $sum: "$count" } } }
          ]
        }
      }
    ]);

    const todayServices = servicesAgg[0].today || [];
    const weekServices = servicesAgg[0].week || [];
    const monthServices = servicesAgg[0].month || [];

    // Tính trung bình / ngày trong tuần và tháng
    const daysInWeek = (now - weekStart) / (1000 * 60 * 60 * 24) + 1;
    const daysInMonth = now.getDate();

    const mergedServices = {};
    const addData = (list, key) => {
      list.forEach((s) => {
        if (!mergedServices[s._id]) mergedServices[s._id] = { service: s._id };
        mergedServices[s._id][key] = s.total;
      });
    };
    addData(todayServices, "today");
    addData(weekServices, "week");
    addData(monthServices, "month");

    const serviceStats = Object.values(mergedServices).map((s) => ({
      service: s.service,
      today: s.today || 0,
      week: s.week || 0,
      month: s.month || 0,
      avgWeek: (s.week || 0) / daysInWeek,
      avgMonth: (s.month || 0) / daysInMonth
    }));

    // Tìm top service trong tuần
    const topService = serviceStats.sort((a, b) => b.week - a.week)[0] || null;

    // --- 4️⃣ Top API theo tuần (bỏ /stats và /increment) ---
    const topApiAgg = await RequestStats.aggregate([
      {
        $match: {
          date: { $gte: weekStr },
          api: { $nin: [/\/stats/i, /\/increment/i] }
        }
      },
      {
        $group: {
          _id: { service: "$service", api: "$api" },
          totalWeek: { $sum: "$count" },
          avgPerWeek: { $avg: "$count" }
        }
      },
      { $sort: { totalWeek: -1 } },
      { $limit: 1 }
    ]);

    const topApi =
      topApiAgg.length > 0
        ? {
            service: topApiAgg[0]._id.service,
            api: topApiAgg[0]._id.api,
            totalWeek: topApiAgg[0].totalWeek,
            avgPerWeek: topApiAgg[0].avgPerWeek.toFixed(2)
          }
        : null;

    // --- 5️⃣ Thống kê theo ngày trong tuần (để vẽ biểu đồ nếu cần) ---
    const dailyAgg = await RequestStats.aggregate([
      { $match: { date: { $gte: weekStr } } },
      { $group: { _id: "$date", total: { $sum: "$count" } } },
      { $sort: { _id: 1 } }
    ]);
    const dailyStats = dailyAgg.map((d) => ({
      date: d._id,
      totalRequests: d.total
    }));

    // --- Kết quả ---
    res.json({
      message: "📈 Thống kê chi tiết Request Logs thành công ✅",
      today: { date: todayStr, total: totalToday },
      month: { month: `${currentMonth}-${currentYear}`, total: totalThisMonth },
      services: {
        details: serviceStats,
        topService: topService
          ? {
              name: topService.service,
              total: topService.week,
              weekRange: `${weekStr} → ${todayStr}`
            }
          : null
      },
      api: topApi
        ? {
            service: topApi.service,
            api: topApi.api,
            totalWeek: topApi.totalWeek,
            avgPerWeek: topApi.avgPerWeek,
            weekRange: `${weekStr} → ${todayStr}`
          }
        : null,
      dailyStats
    });
  } catch (err) {
    console.error("❌ getRequestLogsStats:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


module.exports = {
  incrementRequestCount,
  getDailyStats,
  getWeeklyStats , getAllServiceStats, getRequestLogsStats
};