const mongoose = require('mongoose');

const AuthSchema = new mongoose.Schema({
  phone: { type: String, unique: true, sparse: true }, // cho local (tuỳ bạn dùng phone hoặc email)
  email: { type: String, unique: true, sparse: true }, // local hoặc google
  passwordHash: { type: String },                      // chỉ có nếu provider = 'local'
  provider: { type: String, enum: ['local', 'google'], default: 'local' },
  providerId: { type: String },                        // Google sub (id duy nhất từ Google)
  role: { type: String, default: 'user' },
  emailVerified: { type: Boolean, default: false },

}, { timestamps: true });

module.exports = mongoose.model('Auth', AuthSchema);