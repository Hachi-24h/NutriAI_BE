const mongoose = require("mongoose");

const DateMealsSchema = new mongoose.Schema({
  dateID: { type: String, required: true }, // ví dụ "2025-08-26"
  listMealsTime: [{ type: String, required: true }] 
}, { timestamps: true });

module.exports = mongoose.model("DateMeals", DateMealsSchema);
