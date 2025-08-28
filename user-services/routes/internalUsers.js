const express = require('express');
const router = express.Router();
const requireInternal = require('../middlewares/requireInternal');
const User = require('../models/User');

router.post('/ensure', requireInternal, async (req, res) => {
  try {
    const { authId, fullname, gender, DOB, phone, avatar } = req.body || {};
    if (!authId) return res.status(400).json({ message: 'Missing authId' });

    // ---- Chuẩn hoá dữ liệu an toàn theo schema của bạn ----
    const ALLOWED_GENDERS = ['MALE', 'FEMALE', 'OTHER'];   // đổi theo schema thực tế nếu khác
    const finalGender = gender
      ? (ALLOWED_GENDERS.includes(String(gender).toUpperCase())
          ? String(gender).toUpperCase()
          : 'OTHER')
      : 'OTHER';

    const finalDOB = DOB ? new Date(DOB) : new Date('2000-01-01'); // vì schema yêu cầu DOB

    // Lưu ý: chỉ set các field có trong schema User của bạn
    const patch = {};
    if (fullname !== undefined) patch.fullname = fullname;
    if (phone    !== undefined) patch.phone    = phone;   // nếu schema có
    if (avatar   !== undefined) patch.avatar   = avatar;  // nếu schema có

    let user = await User.findOne({ authId });
    if (!user) {
      // lần đầu -> TẠO MỚI với default hợp lệ
      user = await User.create({
        authId,
        fullname: patch.fullname || 'Google User',
        gender: finalGender,
        DOB: finalDOB,
        ...(patch.phone  ? { phone: patch.phone }   : {}),
        ...(patch.avatar ? { avatar: patch.avatar } : {}),
        height: 0,
        weight: 0,
      });
    } else {
      // đã có -> cập nhật nhẹ nếu cần (không bắt buộc)
      const toSet = {};
      if (patch.fullname) toSet.fullname = patch.fullname;
      if (patch.phone)    toSet.phone    = patch.phone;
      if (patch.avatar)   toSet.avatar   = patch.avatar;
      if (Object.keys(toSet).length) {
        await User.updateOne({ _id: user._id }, { $set: toSet });
      }
    }

    res.json({ ok: true, userId: user._id.toString() });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
