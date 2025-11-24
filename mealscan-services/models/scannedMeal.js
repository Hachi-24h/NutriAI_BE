const mongoose = require("mongoose");

const ScannedMealSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    food_en: { type: String, required: true },
    food_vi: { type: String, required: true },
    image_url: { type: String, required: true }, // Đường dẫn ảnh
    nutrition: {
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
    },
    confidence: { type: Number, default: 0 },
    mealType: {
      type: String,
      enum: ["BREAKFAST", "LUNCH", "DINNER", "OTHER"],
      default: "OTHER",
    },
    scannedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ScannedMeal", ScannedMealSchema);
