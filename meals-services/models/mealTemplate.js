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
  sharedWith: [
    {
      userId: { type: String, required: true },
      status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
      sharedAt: { type: Date, default: Date.now },
      acceptedAt: { type: Date, default: null }
    }
  ],
  sharedBy: { type: String, default: null }
});

module.exports = mongoose.model("MealTemplate", MealTemplateSchema);
