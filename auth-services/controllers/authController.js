// controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Auth = require("../models/auth");
const RefreshToken = require("../models/RefreshToken");
const { OAuth2Client } = require("google-auth-library");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access-secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh-secret";
const ACCESS_TTL = "15m"; // 15 phút
const REFRESH_TTL_DAYS = 30; // 30 ngày
const axios = require('axios');

const USER_SERVICE_BASE_URL = process.env.USER_SERVICE_BASE_URL;
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

async function ensureUserProfile(authId, initialProfile = {}) {
  if (!USER_SERVICE_BASE_URL) return; // dev chưa set env thì bỏ qua
  try {
    await axios.post(
      `${USER_SERVICE_BASE_URL}/internal/users/ensure`,
      { authId, ...initialProfile },
      { headers: { 'x-internal-secret': INTERNAL_API_SECRET } }
    );
  } catch (e) {
    console.error('ensureUserProfile failed:', e?.response?.data || e.message);
  }
}
// helper
function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}
function signAccessToken(auth) {
  return jwt.sign(
    { sub: auth._id.toString(), phone: auth.phone, email: auth.email, role: auth.role },
    JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TTL, issuer: "auth-service" }
  );
}
function signRefreshToken(auth) {
  return jwt.sign(
    { sub: auth._id.toString(), typ: "refresh" },
    JWT_REFRESH_SECRET,
    { expiresIn: `${REFRESH_TTL_DAYS}d`, issuer: "auth-service" }
  );
}
async function saveRefreshToken(authId, refreshRaw) {
  const tokenHash = sha256(refreshRaw);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ user: authId, tokenHash, expiresAt });
}

// ====== ĐĂNG KÝ ======
exports.register = async (req, res) => {
  try {
    const { phone, email, password } = req.body || {};
    if (!phone || !password) return res.status(400).json({ message: "Missing phone/password" });

    const existed = await Auth.findOne({ $or: [{ phone }, ...(email ? [{ email }] : [])] });
    if (existed) return res.status(409).json({ message: "Phone/Email already exists" });

    const passwordHash = await bcrypt.hash(password, 12);
    const auth = await Auth.create({ phone, email, passwordHash, provider: "local" });

    const access_token = signAccessToken(auth);
    const refresh_token = signRefreshToken(auth);
    await saveRefreshToken(auth._id, refresh_token);

    res.status(201).json({
      access_token,
      refresh_token,
      token_type: "Bearer",
      expires_in: 900
    });
  } catch (err) {
    res.status(500).json({ message: "Register failed", error: err.message });
  }
};

// ====== ĐĂNG NHẬP ======
exports.login = async (req, res) => {
  try {
    const { phoneOrEmail, password } = req.body || {};
    if (!phoneOrEmail || !password) 
      return res.status(400).json({ message: "Missing fields" });

    const query = phoneOrEmail.includes("@")
      ? { email: phoneOrEmail.toLowerCase() }
      : { phone: phoneOrEmail };

    const auth = await Auth.findOne(query);

    if (!auth) {
      // ⚠️ Trường hợp chưa đăng ký
      return res.status(404).json({ message: "Account not found" });
    }

    const ok = await bcrypt.compare(password, auth.passwordHash || "");
    if (!ok) {
      // ⚠️ Trường hợp mật khẩu sai
      return res.status(401).json({ message: "Incorrect password" });
    }

    // Đăng nhập thành công
    const access_token = signAccessToken(auth);
    const refresh_token = signRefreshToken(auth);
    await saveRefreshToken(auth._id, refresh_token);

    return res.json({
      access_token,
      refresh_token,
      token_type: "Bearer",
      expires_in: 900
    });
  } catch (err) {
    return res.status(500).json({ message: "Login failed", error: err.message });
  }
};




// ====== Đăng nhập Google ======
// controllers/authController.js
// === Đăng nhập/đăng ký Google (1 endpoint) ===
exports.loginWithGoogle = async (req, res) => {
  try {
    const { id_token } = req.body || {};
    if (!id_token) return res.status(400).json({ message: 'Missing id_token' });

    // 1) verify với Google
    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const p = ticket.getPayload(); // { sub, email, name, picture, given_name, family_name, ... }

    // 2) tìm hoặc tạo Auth
    let auth = await Auth.findOne({ provider: 'google', providerId: p.sub });
    if (!auth) {
      const email = (p.email || '').toLowerCase();
      // nếu đã có tài khoản theo email -> gắn thêm providerId
      auth = await Auth.findOne({ email });
      if (auth) {
        auth.provider = 'google';
        auth.providerId = p.sub;
        await auth.save();
      } else {
        auth = await Auth.create({
          email,
          provider: 'google',
          providerId: p.sub
        });
      }
    }

    // 3) phát token
    const access_token = signAccessToken(auth);
    const refresh_token = signRefreshToken(auth);
    await saveRefreshToken(auth._id, refresh_token);

    // 4) đảm bảo có User (dùng info Google, gán mặc định phần thiếu)
    await ensureUserProfile(auth._id.toString(), {
      fullname: p.name || `${p.given_name || ''} ${p.family_name || ''}`.trim() || 'Google User',
      gender: 'OTHER',
      DOB: null,
      email: p.email || null,
      avatar: p.picture || null,
    });

    return res.json({
      access_token,
      refresh_token,
      token_type: 'Bearer',
      expires_in: 900
    });
  } catch (err) {
    console.error('Google login error:', err?.response?.data || err.message);
    return res.status(401).json({ message: 'Google login failed', error: err.message });
  }
};


// ====== REFRESH TOKEN ======
exports.refresh = async (req, res) => {
  try {
    const { refresh_token } = req.body || {};
    if (!refresh_token) {
      return res.status(400).json({ message: "Missing refresh_token" });
    }

    // Hash refresh token để so sánh DB
    const tokenHash = sha256(refresh_token);
    const tokenDoc = await RefreshToken.findOne({ tokenHash, revoked: false });
    if (!tokenDoc) {
      return res.status(401).json({ message: "Invalid or revoked refresh token" });
    }

    // Verify JWT refresh token
    let payload;
    try {
      payload = jwt.verify(refresh_token, JWT_REFRESH_SECRET, { issuer: "auth-service" });
    } catch (err) {
      return res.status(401).json({ message: "Refresh token expired/invalid" });
    }

    // Lấy auth user
    const auth = await Auth.findById(payload.sub);
    if (!auth) {
      return res.status(404).json({ message: "User not found" });
    }

    // Sinh access token mới
    const access_token = signAccessToken(auth);

    return res.json({
      access_token,
      token_type: "Bearer",
      expires_in: 900, // 15 phút
    });
  } catch (err) {
    return res.status(500).json({ message: "Refresh failed", error: err.message });
  }
};

// ====== LOGOUT ======
exports.logout = async (req, res) => {
  try {
    const { refresh_token } = req.body || {};
    if (!refresh_token) {
      return res.status(400).json({ message: "Missing refresh_token" });
    }

    const tokenHash = sha256(refresh_token);
    const tokenDoc = await RefreshToken.findOne({ tokenHash });
    if (!tokenDoc) {
      return res.status(404).json({ message: "Refresh token not found" });
    }

    // Đánh dấu revoked
    tokenDoc.revoked = true;
    await tokenDoc.save();

    return res.json({ message: "Logged out successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Logout failed", error: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const auth = req.auth;
    if (!auth) return res.status(401).json({ message: "Unauthorized" });

    return res.json({
      id: auth.id,   // 👈 đổi từ _id sang id
      email: auth.email,
      phone: auth.phone,
      role: auth.role,
    });
  } catch (err) {
    return res.status(500).json({ message: "Get me failed", error: err.message });
  }
};


// change password by phone
exports.resetPasswordByPhone = async (req, res) => {
  try {
    const { phone, newPassword } = req.body || {};

    // Kiểm tra dữ liệu đầu vào
    if (!phone || !newPassword) {
      return res.status(400).json({ message: "Missing phone or new password" });
    }

    // Tìm user theo số điện thoại
    const auth = await Auth.findOne({ phone });
    if (!auth) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Hash mật khẩu mới
    const passwordHash = await bcrypt.hash(newPassword, 12);
    auth.passwordHash = passwordHash;
    await auth.save();

    return res.json({ message: "Password has been reset successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Reset password failed", error: err.message });
  }
};