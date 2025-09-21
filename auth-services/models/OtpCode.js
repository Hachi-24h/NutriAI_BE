// models/OtpCode.js
const mongoose = require("mongoose");

const otpCodeSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 } 
  // ⏰ tự xóa sau 300 giây (5 phút)
});

module.exports = mongoose.model("OtpCode", otpCodeSchema);
