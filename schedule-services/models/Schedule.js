const mongoose = require("mongoose");

const DailyPlanSchema = new mongoose.Schema({
  dayOrder: { type: Number, required: true },
  idMealDay: { type: String, required: true }
});

const ScheduleSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  nameSchedule: { type: String, required: true },
  idTemplate: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  height: { type: Number },
  weight: { type: Number },
  gender: { type: String, enum: ["nam", "nữ", "khác"] },
  age: { type: Number },
  goal: { type: String },
  kgGoal: { type: Number },
  daily: { type: [DailyPlanSchema], required: true },

  // 🧠 Nếu lịch này được tạo từ template chia sẻ
  shareFrom: { type: String, default: null }, // ID user gốc

  status: { type: String, enum: ["draft", "active", "completed"], default: "active" },
  createdAt: { type: Date, default: Date.now },

  // ✅ true = private, false = public/shared
  private: { type: Boolean, required: true, default: true },
});

module.exports = mongoose.model("Schedule", ScheduleSchema);
