import mongoose from "mongoose";

const MealSchema = new mongoose.Schema({
  mealType: { type: String, enum: ["sáng", "trưa", "chiều", "tối"], required: true },
  mealTime: { type: String, required: true },
  nameMeals: { type: String, required: true },
  description: { type: String },
  CPFCa: { type: [Number], default: [0, 0, 0, 0] } // Calories, Protein, Fat, Carb
});

const MealDaySchema = new mongoose.Schema({
  dateID: { type: String, required: true },       // "Day 1", "Day 2"...
  meals: { type: [MealSchema], required: true },  // Danh sách bữa ăn
  createdBy: { type: String, required: true },    // chỉ lưu id user tạo
  createdAt: { type: Date, default: Date.now }    // auto timestamp
});

export default mongoose.model("MealDay", MealDaySchema);
