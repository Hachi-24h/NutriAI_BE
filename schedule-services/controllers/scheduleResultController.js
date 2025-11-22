// controllers/scheduleResultController.js
const Schedule = require("../models/Schedule");
const ScheduleResult = require("../models/ScheduleResult");

exports.getResultByScheduleId = (req, res) => {
  console.log("🔥 /by-schedule hit");
  console.log("Body:", req.body);
};

// 🧾 Gửi form đánh giá sau khi hoàn thành lịch
const submitScheduleResult = async (req, res) => {
  try {
    const userId = req.auth.id;
    const scheduleId = req.params.scheduleId;
    const existing = await ScheduleResult.findOne({ userId, scheduleId });
    if (existing) return res.status(400).json({ message: "Bạn đã đánh giá lịch này rồi." });

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) return res.status(404).json({ message: "Không tìm thấy lịch trình." });

    const body = req.body;
    const totalDays = schedule.daily?.length || 0;
    const daysCompleted = body.daysCompleted || totalDays;
    const adherenceScore = totalDays ? Math.round((daysCompleted / totalDays) * 100) : 0;

    let goalAchieved = false;
    let progressPercent = 0;

    const weightBefore = schedule.weight;
    const weightAfter = body.weightAfter ?? weightBefore;
    const weightChange = weightAfter - weightBefore;

    // 🎯 Logic đánh giá theo loại mục tiêu
    if (["giảm cân", "tăng cân"].includes(schedule.goal)) {
      const target = schedule.kgGoal || 0;
      progressPercent = target !== 0 ? Math.min(100, Math.abs(weightChange / target) * 100) : 0;
      goalAchieved =
        (schedule.goal === "giảm cân" && weightChange <= schedule.kgGoal) ||
        (schedule.goal === "tăng cân" && weightChange >= schedule.kgGoal);
    } else {
      // Duy trì vóc dáng / sức khỏe → dựa vào feedback
      const comment = body.feedback?.comment?.toLowerCase() || "";
      goalAchieved = /(tốt|ổn|hài lòng|khỏe|được|ok|ổn áp)/.test(comment);
      progressPercent = goalAchieved ? 100 : 70;
    }

    const result = await ScheduleResult.create({
      userId,
      scheduleId,
      templateId: schedule.idTemplate,
      goal: schedule.goal,
      kgGoal: schedule.kgGoal,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      weightBefore,
      weightAfter,
      goalAchieved,
      progressPercent,
      daysCompleted,
      totalDays,
      adherenceScore,
      extraActivities: body.extraActivities || [],
      feedback: {
        difficultyLevel: body.feedback?.difficultyLevel,
        comment: body.feedback?.comment
      }
    });

    // ✅ Sau khi lưu có thể cập nhật schedule.status = "evaluated"
    schedule.status = "completed";
    await schedule.save();

    res.status(201).json({ message: "Đánh giá đã được lưu ✅", result });
  } catch (err) {
    console.error("❌ submitScheduleResult:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// 📋 Lấy danh sách kết quả của user
const getResultsByUser = async (req, res) => {
  try {
    const userId = req.auth.id;

    // Lấy danh sách kết quả
    const results = await ScheduleResult.find({ userId }).sort({ createdAt: -1 });

    if (!results.length) {
      return res.status(200).json({
        message: "Bạn chưa có đánh giá nào.",
        total: 0,
        results: []
      });
    }

    // 🔥 JOIN thủ công để thêm thông tin Schedule
    const enrichedResults = await Promise.all(
      results.map(async (result) => {
        const schedule = await Schedule.findById(result.scheduleId);
        return {
          ...result.toObject(),
          nameSchedule: schedule?.nameSchedule || "Không tìm thấy",
          goal: schedule?.goal || result.goal,
          kgGoal: schedule?.kgGoal || result.kgGoal,
          startDate: schedule?.startDate || result.startDate,
          endDate: schedule?.endDate || result.endDate
        };
      })
    );

    res.status(200).json({
      message: "Lấy danh sách đánh giá thành công ✅",
      total: enrichedResults.length,
      results: enrichedResults
    });

  } catch (err) {
    console.error("❌ getResultsByUser:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// 🔍 Lấy chi tiết 1 kết quả cụ thể
const getResultById = async (req, res) => {
  try {
    const userId = req.auth.id;
    const result = await ScheduleResult.findOne({ _id: req.params.id, userId });
    if (!result) return res.status(404).json({ message: "Không tìm thấy đánh giá này." });

    res.status(200).json(result);
  } catch (err) {
    console.error("❌ getResultById:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ❌ Xóa 1 kết quả đánh giá (nếu cần)
const deleteResult = async (req, res) => {
  try {
    const userId = req.auth.id;
    const deleted = await ScheduleResult.findOneAndDelete({ _id: req.params.id, userId });
    if (!deleted) return res.status(404).json({ message: "Không tìm thấy hoặc không có quyền xóa." });

    res.status(200).json({ message: "Đã xóa đánh giá thành công ✅" });
  } catch (err) {
    console.error("❌ deleteResult:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// 🧭 Lấy kết quả của 1 lịch trình cụ thể (theo scheduleId)
const getResultByScheduleId = async (req, res) => {
  try {
    const userId = req.auth.id;
    const { scheduleId } = req.body; // hoặc req.params.scheduleId nếu muốn dùng param
    if (!scheduleId) {
      return res.status(400).json({ message: "Thiếu scheduleId trong body" });
    }

    const result = await ScheduleResult.findOne({ userId, scheduleId });
    if (!result) {
      return res.status(404).json({ message: "Chưa có kết quả đánh giá cho lịch này." });
    }

    res.status(200).json({
      message: "Lấy kết quả lịch trình thành công ✅",
      result
    });
  } catch (err) {
    console.error("❌ getResultByScheduleId:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ==========================
// 📊 Thống kê tổng quan ScheduleResult
// ==========================
const getScheduleResultStatistics = async (req, res) => {
  try {
    const agg = await ScheduleResult.aggregate([
      {
        $group: {
          _id: null,
          avgCompletionRate: { $avg: { $divide: ["$daysCompleted", "$totalDays"] } },
          avgGoalAchievedRate: { $avg: { $cond: ["$goalAchieved", 1, 0] } },
          avgDifficulty: { $avg: "$feedback.difficultyLevel" },
          avgAdherenceScore: { $avg: "$adherenceScore" }
        }
      }
    ]);

    const stats = agg[0] || {};

    res.status(200).json({
      message: "Thống kê ScheduleResult thành công ✅",
      statistics: {
        completionRate: (stats.avgCompletionRate || 0) * 100,
        goalAchievedRate: (stats.avgGoalAchievedRate || 0) * 100,
        difficultyAverage: stats.avgDifficulty || 0,
        adherenceAverage: stats.avgAdherenceScore || 0
      }
    });
  } catch (err) {
    console.error("❌ Lỗi thống kê ScheduleResult:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


module.exports = {
  submitScheduleResult,
  getResultsByUser,
  getResultById,
  deleteResult,
  getResultByScheduleId,getScheduleResultStatistics
};
