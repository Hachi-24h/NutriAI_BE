import mongoose from "mongoose";

// Mapping giữa ngày thực tế trong lịch và ngày mẫu trong template
const DailyPlanSchema = new mongoose.Schema({
  dayOrder: { type: Number, required: true },     // Thứ tự ngày (1 -> 7)
  templateDay: { type: String, required: true },  // "Day 1" / "Day 2" / "Day 3" ...
});

// Lịch ăn cá nhân của user
const ScheduleSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  templateId: { type: String, required: true },
  startDate: { type: Date, required: true },
  daysToDistribute: { type: Number, default: 7 },
  dailyPlan: { type: [DailyPlanSchema], required: true },
  sharedWith: [{ type: String }],
  sharedFrom: { type: String, default: null },   // ID lịch gốc nếu là bản được share
  status: { type: String, enum: ["draft", "active", "completed"], default: "active" },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Schedule", ScheduleSchema);
