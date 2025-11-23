// models/OtpCode.js
const mongoose = require("mongoose");

const OtpCodeSchema = new mongoose.Schema({
  email: { type: String },
  phone: { type: String },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 } // hết hạn 5 phút
});

module.exports = mongoose.model("OtpCode", OtpCodeSchema);
