const mongoose = require("mongoose");

const OtpCodeSchema = new mongoose.Schema({
  email: { type: String },
  phone: { type: String },
  code: { type: String, required: true },

  purpose: { type: String, required: true },  // thêm mục đích

  meta: { type: Object }, // dùng để lưu phone + passwordHash

  createdAt: { type: Date, default: Date.now, expires: 300 }
});

module.exports = mongoose.model("OtpCode", OtpCodeSchema);
