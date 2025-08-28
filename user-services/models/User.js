const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  authId: { type: mongoose.Schema.Types.ObjectId, required: true }, // chỉ lưu id
  fullname: { type: String, required: true },
  gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'], default: 'OTHER' },
  DOB: { type: Date, required: true },
  height: { type: String },
  weight: { type: String },
  BMI: { type: String },
  activityLevel: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
