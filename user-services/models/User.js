const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  authId: { type: String, required: true }, // 👈 sửa thành String
  fullname: { type: String, required: true },
  gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'], default: 'OTHER' },
  DOB: { type: Date, required: true },
  height: { type: String },
  weight: { type: String },
  BMI: { type: String },
  activityLevel: { type: Number },
  avt: { type: String } ,// 👈 thêm trường avatar
  medicalConditions: { type: [String] , default: [] },
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
