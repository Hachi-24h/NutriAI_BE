const Schedule = require("../models/Schedule");

// Thêm schedule
exports.createSchedule = async (req, res) => {
  try {
    const { type, startDate, endDate, note, mealsPerDay, userId, goals, scheduleResult } = req.body;

    const newSchedule = new Schedule({
      type, startDate, endDate, note, mealsPerDay, userId, goals, scheduleResult
    });

    const saved = await newSchedule.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Lấy tất cả schedules
exports.getSchedules = async (req, res) => {
  try {
    const schedules = await Schedule.find();
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
