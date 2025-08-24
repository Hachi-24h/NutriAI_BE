const mongoose = require("mongoose");

const MedicalRecordSchema = new mongoose.Schema({
  nameMedical: { type: String, required: true },
  medicalStatus: { type: String, required: true },
  note: { type: String },

  // lưu _id của User
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

module.exports = mongoose.model("MedicalRecord", MedicalRecordSchema);
