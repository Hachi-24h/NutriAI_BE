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
      fullname : fullname.trim().tolowerCase(),
      gender,
      DOB,
      height : height.trim(),
      weight : weight.trim(),
      avt: avt?.trim() || DEFAULT_AVATAR  
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

exports.ensureUserProfile = async (req, res) => {
  try {
    const { authId, fullname, gender, DOB, email, avatar } = req.body;

    let user = await User.findOne({ authId });

    if (!user) {
      // Lần đầu tạo profile
      user = await User.create({
        authId,
        fullname: fullname || "New User",
        gender: gender || "OTHER",
        DOB: DOB || null,
        email: email || null,
        avt: avatar || "https://cdn-icons-png.flaticon.com/512/149/149071.png"
      });
      return res.json({ created: true, user });
    }

    // Nếu đã có profile, KHÔNG override fullname
    if (email && !user.email) user.email = email;
    if (avatar && !user.avt) user.avt = avatar;
    if (gender && !user.gender) user.gender = gender;
    if (DOB && !user.DOB) user.DOB = DOB;

    await user.save();
    return res.json({ created: false, user });
  } catch (err) {
    res.status(500).json({ message: "Ensure user profile failed", error: err.message });
  }
};