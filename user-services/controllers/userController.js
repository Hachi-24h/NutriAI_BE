const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
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

    const authId = req.auth.id;
    if (!authId) return res.status(401).json({ message: "No authId in token" });

    const user = await User.create({
      authId,
      fullname,
      gender,
      DOB,
      height,
      weight,
      avt: avt || DEFAULT_AVATAR   // 👈 gán mặc định nếu không truyền
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

// Cập nhật thông tin user (PUT)
exports.updateUserInfo = async (req, res) => {
  try {
    const authId = req.auth.id; // lấy từ token
    const { fullname, DOB, gender } = req.body;

    const updatedUser = await User.findOneAndUpdate(
      { authId },
      { fullname, DOB, gender },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(updatedUser);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Update user info failed", error: err.message });
  }
};

// Cập nhật sức khoẻ (chiều cao, cân nặng)
exports.updateUserHealth = async (req, res) => {
  try {
    const authId = req.auth.id; // lấy từ token
    const { height, weight } = req.body;

    const updatedUser = await User.findOneAndUpdate(
      { authId },
      { height, weight },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(updatedUser);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Update user health failed", error: err.message });
  }
};




// Upload avatar và update DB
exports.uploadAndUpdateAvatar = async (req, res) => {
  try {
    const authId = req.auth.id; // lấy từ token

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Upload file buffer lên Cloudinary bằng stream
    const stream = cloudinary.uploader.upload_stream(
      { folder: "uploads" },
      async (error, result) => {
        if (error) {
          return res.status(500).json({ message: "Upload failed", error });
        }

        // Update field avt trong DB bằng link mới
        const updatedUser = await User.findOneAndUpdate(
          { authId },
          { $set: { avt: result.secure_url } },
          { new: true }
        );

        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }

        res.json({
          message: "Avatar uploaded and updated successfully",
          user: updatedUser
        });
      }
    );

    stream.end(req.file.buffer);
  } catch (err) {
    res.status(500).json({ message: "Upload and update avatar failed", error: err.message });
  }
};
