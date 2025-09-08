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
    const { fullname, gender, DOB, height, weight, avt } = req.body || {};
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
      weight,
      avt // 👈 thêm avatar vào create
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
// Cập nhật thông tin user
exports.updateUser = async (req, res) => {
  try {
    const authId = req.auth.id; // lấy từ token
    const { fullname, DOB, gender, height, weight, avt } = req.body;

    const updatedUser = await User.findOneAndUpdate(
      { authId },
      { fullname, DOB, gender, height, weight, avt },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: "Update user failed", error: err.message });
  }
};

// Cập nhật avatar user (PATCH)
exports.updateAvatar = async (req, res) => {
  try {
    const authId = req.auth.id; // lấy từ token
    const { avt } = req.body;

    if (!avt || typeof avt !== "string") {
      return res.status(400).json({ message: "Avatar link is required" });
    }

    const updatedUser = await User.findOneAndUpdate(
      { authId },
      { $set: { avt } }, // chỉ update field avt
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Avatar updated successfully",
      user: updatedUser
    });
  } catch (err) {
    res.status(500).json({ message: "Update avatar failed", error: err.message });
  }
};