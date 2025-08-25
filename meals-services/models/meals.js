const mongoose = require("mongoose");

const MealsSchema = new mongoose.Schema({
  nameMeals: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  totalCalor: { type: Number, required: true, min: 0, default: 0 } // Float -> Number
}, { timestamps: true });

module.exports = mongoose.model("Meals", MealsSchema);
