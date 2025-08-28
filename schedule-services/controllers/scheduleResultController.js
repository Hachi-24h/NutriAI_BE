const ScheduleResult = require("../models/ScheduleResult");

// Thêm schedule result
exports.createScheduleResult = async (req, res) => {
  try {
    const { scheduleId, heightResult, weightResult, effectLevel, percentFinish } = req.body;
    const newResult = new ScheduleResult({ scheduleId, heightResult, weightResult, effectLevel, percentFinish });
    const saved = await newResult.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Lấy tất cả schedule results
exports.getScheduleResults = async (req, res) => {
  try {
    const results = await ScheduleResult.find();
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
