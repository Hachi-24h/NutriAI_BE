// models/mealsTime.js
const mongoose = require("mongoose");
const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER"];

const MealsTimeSchema = new mongoose.Schema({
  typeTime: { type: String, enum: MEAL_TYPES, required: true },
  time: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },

  // Gắn ID của Meals
  listMeals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Meals",
    required: true
  }]
}, { timestamps: true });

module.exports = mongoose.model("MealsTime", MealsTimeSchema);
