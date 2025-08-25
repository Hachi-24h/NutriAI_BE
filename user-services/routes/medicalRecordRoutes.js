const express = require("express");
const router = express.Router();
const {
  createMedicalRecord,
  getAllMedicalRecords
} = require("../controllers/medicalRecordController");

// API: thêm 1 bệnh
router.post("/create", createMedicalRecord);

// API: lấy tất cả bệnh
router.get("/getAll", getAllMedicalRecords);

module.exports = router;
