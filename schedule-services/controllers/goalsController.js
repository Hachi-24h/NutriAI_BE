const Goals = require("../models/Goals");

// Thêm goals
exports.createGoals = async (req, res) => {
  try {
    const { scheduleId, heightGoals, weightGoals, target } = req.body;
    const newGoals = new Goals({ scheduleId, heightGoals, weightGoals, target });
    const saved = await newGoals.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Lấy tất cả goals
exports.getGoals = async (req, res) => {
  try {
    const goals = await Goals.find();
    res.json(goals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
