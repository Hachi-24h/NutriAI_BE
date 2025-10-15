const mongoose = require('mongoose');

const ProviderSchema = new mongoose.Schema({
  type: { type: String, enum: ['local', 'google'], required: true },
  providerId: { type: String },    // Google sub
  passwordHash: { type: String },  // Chỉ cho local
}, { _id: false });

const AuthSchema = new mongoose.Schema({
  phone: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, sparse: true },
  emailVerified: { type: Boolean, default: false }, // 👈 thêm dòng này
  providers: [ProviderSchema],     // 👈 danh sách provider
  biometric: { type: Boolean, default: false }, // 👈 thêm dòng này
  role: { type: String, default: 'user' },
}, { timestamps: true });

module.exports = mongoose.model('Auth', AuthSchema);
