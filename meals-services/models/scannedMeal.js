// models/scannedMeal.js
const mongoose = require("mongoose");

const ScannedMealSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  food_en: { type: String, required: true },
  food_vi: { type: String, required: true },
  image_url: { type: String, required: true }, // Đường dẫn ảnh upload
  nutrition: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
  },
  confidence: { type: Number, default: 0 },
  scannedAt: { type: Date, default: Date.now },
  mealType: { type: String, enum: ["BREAKFAST", "LUNCH", "DINNER", "OTHER"], default: "OTHER" }
}, { timestamps: true });

module.exports = mongoose.model("ScannedMeal", ScannedMealSchema);
