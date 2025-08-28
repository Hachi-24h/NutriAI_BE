// models/RefreshToken.js
const mongoose = require('mongoose');

const RefreshTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'Auth', required: true },
  tokenHash: { type: String, required: true },   // lưu SHA-256 của refresh token
  revoked: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
  replacedBy: { type: String }                   // (tuỳ chọn) hash token mới khi rotate
}, { timestamps: true });

// (tuỳ chọn) TTL index: khi hết hạn thì tự xoá
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', RefreshTokenSchema);
