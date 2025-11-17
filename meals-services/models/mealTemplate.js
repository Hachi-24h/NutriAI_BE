const mongoose = require("mongoose");

const MealTemplateSchema = new mongoose.Schema({
  userIdCreate: { type: String, required: true },
  description: { type: String },
  dayTemplate: [{ type: String, required: true }],
  goal: { type: String },
  kgGoal: { type: Number },
  maintainDuration: { type: Number, default: 7 },
  BMIUser: { type: Number },
  createdAt: { type: Date, default: Date.now },
  sharedWith: [{ type: String, default: [] }],
  sharedBy: { type: String, default: null }
});

module.exports = mongoose.model("MealTemplate", MealTemplateSchema);
