const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  gender: { type: String, required: true },
  DOB: { type: Date, required: true },
  height: { type: String },
  weight: { type: String },
  BMI: { type: String },
  activityLevel: { type: Number }
}, { timestamps: true });  // tự động thêm createdAt, updatedAt

module.exports = mongoose.model("User", UserSchema);
