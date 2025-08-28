const mongoose = require("mongoose");

const ScheduleSchema = new mongoose.Schema({
    type: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    note: { type: String },
    mealsPerDay: { type: Number },
    userId: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model("Schedule", ScheduleSchema);
