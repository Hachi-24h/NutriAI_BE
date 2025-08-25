// models/admin.js
// Mongoose model cho tài khoản admin (tùy chọn, dùng để gán quyền/quản lý admin nội bộ)
const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    displayName: { type: String, required: true },
    // có thể lưu hash mật khẩu riêng cho admin-svc nếu cần
    passwordHash: { type: String }, 
    // liên kết sang auth-svc (id của tài khoản bên Auth)
    authUserId: { type: String },
    role: { type: String, enum: ['ADMIN', 'SUPERADMIN'], default: 'ADMIN' },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true, collection: 'admins' }
);

module.exports = mongoose.model('Admin', AdminSchema);
