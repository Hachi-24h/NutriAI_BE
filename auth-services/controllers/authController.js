// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Auth = require('../models/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

/**
 * POST /accounts
 * body: { phone, email, password, fullname }
 * Trả về: { user, accessToken }
 */
exports.createAccount = async (req, res) => {
  try {
    let { phone, email, password, fullname } = req.body;

    if (!phone || !email || !password || !fullname) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    email = String(email).trim().toLowerCase();
    phone = String(phone).trim();

    // kiểm tra trùng email/phone
    const existed = await Auth.findOne({ $or: [{ email }, { phone }] });
    if (existed) {
      return res.status(400).json({ message: 'Email/Phone already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await Auth.create({
      phone,
      email,
      passwordHash,
      userDetail: { fullname }
    });

    // Ẩn passwordHash khi trả về
    const plain = user.toObject();
    delete plain.passwordHash;

    // (tuỳ chọn) phát token để bạn có thể test luôn các route cần auth
    const accessToken = jwt.sign(
      { sub: user._id.toString(), role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({ user: plain, accessToken });
  } catch (err) {
    // Nếu model có unique index cho email/phone -> lỗi 11000
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Duplicate email/phone' });
    }
    return res.status(500).json({ message: 'Create account failed', error: err.message });
  }
};

/**
 * GET /accounts
 * Trả về danh sách user (ẩn passwordHash)
 */
exports.getAllAccounts = async (req, res) => {
  try {
    const users = await Auth.find()
      .select('-passwordHash')
      .sort('-createdAt');

    return res.json(users);
  } catch (err) {
    return res.status(500).json({ message: 'Get all accounts failed', error: err.message });
  }
};
