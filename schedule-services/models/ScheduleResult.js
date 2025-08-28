const mongoose = require("mongoose");

const ScheduleResultSchema = new mongoose.Schema({
  heightResult: { type: String },
  weightResult: { type: String },
  effectLevel: { type: Number },
  percentFinish: { type: Number },
  scheduleId: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model("ScheduleResult", ScheduleResultSchema);
