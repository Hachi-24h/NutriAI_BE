const express = require("express");
const router = express.Router();
const requireInternal = require("../middlewares/requireInternal");
const User = require("../models/User");

// ✅ 1️⃣ Endpoint: Tạo hoặc cập nhật hồ sơ user (đã có sẵn)
router.post("/ensure", requireInternal, async (req, res) => {
  try {
    const { authId, fullname, gender, DOB, email, avatar, phone } = req.body || {};
    if (!authId) return res.status(400).json({ message: "Missing authId" });

    const ALLOWED_GENDERS = ["MALE", "FEMALE", "OTHER"];
    const finalGender = gender && ALLOWED_GENDERS.includes(String(gender).toUpperCase())
      ? String(gender).toUpperCase()
      : "OTHER";

    const finalDOB = DOB ? new Date(DOB) : new Date("2000-01-01");

    // Tìm user theo authId
    let user = await User.findOne({ authId });

    if (!user) {
      // 👉 Nếu chưa có → tạo mới
      user = await User.create({
        authId,
        fullname: fullname || "Người dùng mới",
        gender: finalGender,
        DOB: finalDOB,
        email: email || null,
        phone: phone || null,
        avt: avatar || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
        height: 0,
        weight: 0,
      });
      return res.json({ created: true, user });
    }

    // 👉 Nếu đã có profile → cập nhật các trường trống
    let updated = false;
    if (!user.fullname && fullname) { user.fullname = fullname; updated = true; }
    if (!user.email && email) { user.email = email; updated = true; }
    if (!user.phone && phone) { user.phone = phone; updated = true; }
    if (!user.avt && avatar) { user.avt = avatar; updated = true; }
    if (!user.gender && gender) { user.gender = finalGender; updated = true; }
    if (!user.DOB && DOB) { user.DOB = finalDOB; updated = true; }

    if (updated) await user.save();

    res.json({ created: false, user });
  } catch (err) {
    console.error("ensureUserProfile error:", err);
    res.status(500).json({ message: "Ensure user profile failed", error: err.message });
  }
});

// ✅ 2️⃣ Endpoint: Lấy thông tin hồ sơ user theo authId (cho admin-service hoặc auth-service dùng)
router.get("/profile/:authId", async (req, res) => {
  try {
    const user = await User.findOne({ authId: req.params.authId }).select(
      "fullname gender DOB height weight BMI activityLevel avt createdAt"
    );
    if (!user) return res.status(404).json({ message: "Profile not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Get profile failed", error: err.message });
  }
});

module.exports = router;
