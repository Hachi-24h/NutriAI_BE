import mongoose from "mongoose";

const MealSchema = new mongoose.Schema({
  mealType: { type: String, enum: ["sáng", "trưa", "chiều", "tối"], required: true },
  mealTime: { type: String, required: true },              // giờ ăn, ví dụ "07:00"
  mealName: { type: String, required: true },              // tên món
  description: { type: String },                           // mô tả chi tiết
  CPFCa: { type: [Number], default: [0, 0, 0, 0] }         // [calo, protein, fat, carbs]
});

const MealDaySchema = new mongoose.Schema({
  dateID: { type: String, required: true },                // "Day 1", "Day 2"...
  meals: { type: [MealSchema], required: true },           // danh sách món ăn trong ngày
  createdBy: { type: String, required: true },             // user tạo
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("MealDay", MealDaySchema);
