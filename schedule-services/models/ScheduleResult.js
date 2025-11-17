// models/ScheduleResult.js
const mongoose = require("mongoose");

const ScheduleResultSchema = new mongoose.Schema({
  // 🧱 Liên kết và thông tin cơ bản
  userId: { type: String, required: true },
  scheduleId: { type: String, required: true },
  templateId: { type: String },
  goal: { type: String }, // tăng cân / giảm cân / duy trì vóc dáng / duy trì sức khỏe
  kgGoal: { type: Number },
  startDate: { type: Date },
  endDate: { type: Date },

  // ⚖️ Kết quả thực tế
  weightBefore: { type: Number },
  weightAfter: { type: Number },
  goalAchieved: { type: Boolean, default: false },
  progressPercent: { type: Number, default: 0 },
  daysCompleted: { type: Number, default: 0 },
  totalDays: { type: Number, default: 0 },
  adherenceScore: { type: Number, default: 0 }, // % tuân thủ
  extraActivities: [{ type: String }], // gym, yoga, bơi lội...

  // 💬 Feedback cơ bản
  feedback: {
    difficultyLevel: { type: Number, min: 1, max: 5 }, // độ khó user cảm nhận
    comment: { type: String } // cảm nhận / góp ý ngắn
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ScheduleResult", ScheduleResultSchema);
