const User = require("../models/User");

// Lấy danh sách user
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();  // lấy toàn bộ collection User
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findOne({ authId: req.auth.id });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Get me failed", error: err.message });
  }
};

// Tạo user mới
exports.createUser = async (req, res) => {
  try {
    const { fullname, gender, DOB, height, weight } = req.body || {};
    if (!fullname || !gender || !DOB) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // lấy authId từ token
    const authId = req.auth.id;
    if (!authId) return res.status(401).json({ message: "No authId in token" });

    const user = await User.create({
      authId,
      fullname,
      gender,
      DOB,
      height,
      weight
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ message: "Create user failed", error: err.message });
  }
};

// Lấy chi tiết 1 user
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("notiList");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Xóa user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
