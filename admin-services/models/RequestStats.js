const mongoose = require("mongoose");

const RequestStatsSchema = new mongoose.Schema({
  service: { type: String, required: true },
  api: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  count: { type: Number, default: 1 }
});

// 🔒 Mỗi combination service + api + date là duy nhất
RequestStatsSchema.index({ service: 1, api: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("RequestStats", RequestStatsSchema);
