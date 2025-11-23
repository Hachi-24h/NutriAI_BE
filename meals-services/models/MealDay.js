const mongoose = require("mongoose");

const MealSchema = new mongoose.Schema({
  mealType: { type: String, enum: ["sáng", "phụ sáng", "trưa", "chiều", "tối"], required: true },
  mealTime: { type: String, required: true },
  mealName: { type: String, required: true },
  description: { type: String },
  CPFCa: { type: [Number], default: [0, 0, 0, 0] }
});

const MealDaySchema = new mongoose.Schema({
  dateID: { type: String, required: true },
  meals: { type: [MealSchema], required: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("MealDay", MealDaySchema);
