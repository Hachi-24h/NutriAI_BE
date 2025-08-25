// models/auth.js
const mongoose = require('mongoose');

const UserDetailSchema = new mongoose.Schema(
  {
    fullname: { type: String, required: true },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'], default: 'OTHER' },
    DOB: { type: Date },
    height: String,
    weight: String,
    BMI: String,
    activityLevel: Number
  },
  { _id: false } // nhúng trực tiếp vào Auth
);

const AuthSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false }, // hash bcrypt
    googledId: String,
    role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
    userDetail: { type: UserDetailSchema, required: true }
  },
  { timestamps: true, collection: 'auths' }
);

module.exports = mongoose.model('Auth', AuthSchema);
