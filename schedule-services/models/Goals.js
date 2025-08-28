const mongoose = require("mongoose");

const GoalsSchema = new mongoose.Schema({
    scheduleId: { type: String, required: true },
  heightGoals: { type: String },
  weightGoals: { type: String },
  target: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("Goals", GoalsSchema);
