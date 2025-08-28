const express = require("express");
const router = express.Router();
const { createSchedule, getSchedules } = require("../controllers/scheduleController");

// thêm schedule
router.post("/create", createSchedule);

// lấy tất cả schedules
router.get("/getAll", getSchedules);

module.exports = router;
