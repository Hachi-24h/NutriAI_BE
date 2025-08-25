const mongoose = require("mongoose");

const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER"];

const MealsTimeSchema = new mongoose.Schema({
  // Enum cho loại bữa
  typeTime: {
    type: String,
    enum: MEAL_TYPES,
    required: true,
    trim: true,
  },

  // "HH:mm" (thêm regex cho chuẩn 00:00–23:59)
  time: {
    type: String,
    required: true,
    match: /^([01]\d|2[0-3]):[0-5]\d$/,
  },

  // Chỉ lưu ID các Meals; bắt buộc có và ít nhất 1 phần tử
  listMeals: [{
    type: String,
    required: true,
  }]
}, { timestamps: true });

module.exports = mongoose.model("MealsTime", MealsTimeSchema);
