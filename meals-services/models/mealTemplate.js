import mongoose from "mongoose";

const MealTemplateSchema = new mongoose.Schema({
  userIdCreate: { type: String, required: true },            // ID người tạo template
  description: { type: String },
  dayTemplate: [{ type: String, required: true }],           // danh sách ID MealDay
  goal: { type: String },                                   // ví dụ "giảm cân", "tăng cơ"
  kgGoal: { type: Number },                                 // cân nặng mục tiêu
  maintainDuration: { type: Number, default: 7 },           // lịch duy trì trong bao lâu (ngày)
  BMIUser: { type: Number },                                // BMI của user
  createdAt: { type: Date, default: Date.now },
  // 🆕 Thêm 2 field này
  sharedWith: [{ type: String, default: [] }],  // danh sách user được chia sẻ
  sharedBy: { type: String, default: null }     // ai là người chia sẻ
});

export default mongoose.model("MealTemplate", MealTemplateSchema);
