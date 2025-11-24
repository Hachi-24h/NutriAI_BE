const bcrypt = require('bcryptjs');
const axios = require("axios");
// require("dotenv").config({ path: "../.env" });
// console.log("URL AUTH", process.env.ADMIN_SERVICE_URL)
exports.createAdmin = async (req, res) => {
  try {
    const { email, displayName, password } = req.body;

    const normalizedEmail = email.trim().toLowerCase();

    // Gửi request sang auth-service để tạo admin
    const authRes = await axios.post(
      `${process.env.ADMIN_SERVICE_URL}/admin-register`,
      { 
        email: normalizedEmail,
        displayName,
        password
      }
    );

    // Auth-service đã tạo user + gắn role = admin
    return res.status(201).json({
      message: "Admin created from auth-service",
      user: authRes.data.user
    });

  } catch (err) {
    return res.status(500).json({
      message: "Create admin failed",
      error: err.message
    });
  }
};

// 🟦 Lấy danh sách Admin
exports.getAllAdmins = async (req, res) => {
  try {
    // Gọi sang auth-service để lấy những user có role = admin
    const response = await axios.get(`${process.env.ADMIN_SERVICE_URL}/admins`);

    return res.json({ admins: response.data.users });

  } catch (err) {
    return res.status(500).json({
      message: "Get admins failed",
      error: err.message,
    });
  }
};

// 🗑 Xóa Admin theo ID
exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Gọi sang auth-service để xoá user
    const result = await axios.delete(
      `${process.env.ADMIN_SERVICE_URL}/auth/admin/${id}`
    );

    return res.json({
      message: "Admin deleted successfully",
      result: result.data
    });

  } catch (err) {
    return res.status(500).json({
      message: "Delete admin failed",
      error: err.response?.data?.error || err.message
    });
  }
};