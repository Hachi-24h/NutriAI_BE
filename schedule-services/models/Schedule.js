import mongoose from "mongoose";

const DailyPlanSchema = new mongoose.Schema({
  dayOrder: { type: Number, required: true },       // thứ tự ngày (1 → n)
  idMealDay: { type: String, required: true }       // ID của MealDay trong meal-service
});

const ScheduleSchema = new mongoose.Schema({
  userId: { type: String, required: true },          // người tạo lịch
  nameSchedule: { type: String, required: true },    // tên lịch, vd: "Eat Clean Tuần 1"
  idTemplate: { type: String, required: true },      // MealTemplate ID
  startDate: { type: Date, required: true },
  endDate: { type: Date },

  // 🧍‍♂️ Thông tin nhân trắc học để thống kê
  height: { type: Number, required: false },         // chiều cao (cm)
  weight: { type: Number, required: false },         // cân nặng (kg)
  gender: { type: String, enum: ["nam", "nữ", "khác"], required: false },
  age: { type: Number, required: false },

  // Thông tin mục tiêu
  goal: { type: String },                            // ví dụ: "giảm cân"
  kgGoal: { type: Number },

  daily: { type: [DailyPlanSchema], required: true }, // danh sách ngày random
  shareWith: [{ type: String }],
  shareFrom: { type: String, default: null },
  status: { type: String, enum: ["draft", "active", "completed"], default: "active" },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Schedule", ScheduleSchema);
