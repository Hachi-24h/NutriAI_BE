// models/dateMeals.js
const mongoose = require("mongoose");

const DateMealsSchema = new mongoose.Schema({
  dateID: { type: String, required: true }, // "2025-08-26"
  listMealsTime: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "MealsTime"
  }]
}, { timestamps: true });

module.exports = mongoose.model("DateMeals", DateMealsSchema);
