// controllers/adminController.js
const bcrypt = require('bcryptjs');
const Admin = require('../models/admin');

/**
 * POST /admins
 * body: { email, displayName, password?, passwordHash?, authUserId?, role? }
 * - Ưu tiên dùng "password": server sẽ tự hash.
 * - Nếu đã có "passwordHash" thì có thể gửi thẳng (không khuyến nghị trong thực tế).
 * Trả về: 201 { admin }
 */
exports.createAdmin = async (req, res) => {
  try {
    let { email, displayName, password, passwordHash, authUserId, role } = req.body;

    if (!email || !displayName) {
      return res.status(400).json({ message: 'email & displayName are required' });
    }

    email = String(email).trim().toLowerCase();

    // Kiểm tra trùng email
    const existed = await Admin.findOne({ email });
    if (existed) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    // Hash password nếu được gửi dưới dạng plain text
    if (password) {
      passwordHash = await bcrypt.hash(String(password), 10);
    }

    const doc = await Admin.create({
      email,
      displayName,
      passwordHash,     // có thể undefined nếu bạn không yêu cầu mật khẩu
      authUserId,
      role
    });

    const plain = doc.toObject();
    delete plain.passwordHash;

    return res.status(201).json({ admin: plain });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Duplicate key (likely email)' });
    }
    return res.status(400).json({ message: 'Create admin failed', error: err.message });
  }
};

/**
 * GET /admins
 * Trả về danh sách admin (ẩn passwordHash)
 */
exports.getAllAdmins = async (req, res) => {
  try {
    const docs = await Admin.find().select('-passwordHash').sort('-createdAt');
    return res.json(docs);
  } catch (err) {
    return res.status(500).json({ message: 'List admins failed', error: err.message });
  }
};