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


// Tạo user mới
exports.createUser = async (req, res) => {
  try {
    const { fullname, gender, DOB, height, weight, BMI, activityLevel } = req.body;

    const newUser = new User({
      fullname,
      gender,
      DOB,
      height,
      weight,
      BMI,
      activityLevel
    });

    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
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
