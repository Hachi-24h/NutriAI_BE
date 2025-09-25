const express = require("express");
const router = express.Router();
const requireInternal = require("../middlewares/requireInternal");
const User = require("../models/User");

// Endpoint: POST /internal/users/ensure
router.post("/ensure", requireInternal, async (req, res) => {
  try {
    const { authId, fullname, gender, DOB, email, avatar, phone } = req.body || {};
    if (!authId) return res.status(400).json({ message: "Missing authId" });

    // Chuẩn hóa gender
    const ALLOWED_GENDERS = ["MALE", "FEMALE", "OTHER"];
    const finalGender = gender && ALLOWED_GENDERS.includes(String(gender).toUpperCase())
      ? String(gender).toUpperCase()
      : "OTHER";

    const finalDOB = DOB ? new Date(DOB) : new Date("2000-01-01");

    // Kiểm tra user đã có chưa
    let user = await User.findOne({ authId });
    if (!user) {
      // 👉 Lần đầu tạo profile
      user = await User.create({
        authId,
        fullname: fullname || "+1 Lỗi",
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

    // 👉 Nếu đã có profile → KHÔNG overwrite fullname/email
    let updated = false;
    if (!user.fullname && fullname) {
      user.fullname = fullname;
      updated = true;
    }
    if (!user.email && email) {
      user.email = email;
      updated = true;
    }
    if (!user.phone && phone) {
      user.phone = phone;
      updated = true;
    }
    if (!user.avt && avatar) {
      user.avt = avatar;
      updated = true;
    }
    if (!user.gender && gender) {
      user.gender = finalGender;
      updated = true;
    }
    if (!user.DOB && DOB) {
      user.DOB = finalDOB;
      updated = true;
    }

    if (updated) await user.save();

    return res.json({ created: false, user });
  } catch (err) {
    console.error("ensureUserProfile error:", err);
    res.status(500).json({ message: "Ensure user profile failed", error: err.message });
  }
});

module.exports = router;
