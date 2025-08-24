const MedicalRecord = require("../models/MedicalRecord");
const User = require("../models/User");

// Thêm 1 bệnh (MedicalRecord) cho user
exports.createMedicalRecord = async (req, res) => {
  try {
    const { userId, nameMedical, medicalStatus, note } = req.body;

    // Kiểm tra user tồn tại không
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newRecord = new MedicalRecord({
      nameMedical,
      medicalStatus,
      note,
      user: userId
    });

    const savedRecord = await newRecord.save();
    res.status(201).json(savedRecord);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Lấy tất cả bệnh (MedicalRecords)
exports.getAllMedicalRecords = async (req, res) => {
  try {
    const records = await MedicalRecord.find().populate("user", "fullname gender DOB");
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
