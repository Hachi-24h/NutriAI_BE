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
const otpStore = {};
const nodemailer = require("nodemailer");
const emailChangeCodes = {}; // { oldEmail: { code, newEmail } }

// lưu mã tạm thời trong memory (có thể thay bằng Redis)
const emailVerificationCodes = {};

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
    if (!req.auth) return res.status(401).json({ message: "Unauthorized" });

    // luôn query DB để lấy dữ liệu mới nhất
    const auth = await Auth.findById(req.auth.id).lean();
    if (!auth) return res.status(404).json({ message: "User not found" });

    return res.json({
      id: auth._id,
      email: auth.email,
      phone: auth.phone,
      role: auth.role,
      emailVerified: auth.emailVerified || false,  // ✅ luôn có
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

// ====== change password by email
exports.resetPasswordByEmail = async (req, res) => {
  try {
    const { email, newPassword } = req.body || {};
    if (!email || !newPassword) {
      return res.status(400).json({ message: "Missing email or new password" });
    }

    const auth = await Auth.findOne({ email: email.toLowerCase() });
    if (!auth) {
      return res.status(404).json({ message: "Account not found" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    auth.passwordHash = passwordHash;
    await auth.save();

    return res.json({ message: "Password has been reset successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Reset password failed", error: err.message });
  }
};

const textflow = require("textflow.js");

// set API key
textflow.useKey("AKZHinTGMLMECzbDWk8x1XH9MoGzX4BVtknxEs4ukCZNFoIfP1uffNS46XA9FWSx");

// Gửi OTP
exports.sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: "Missing phone" });

    console.log("Sending OTP to:", phone);
    // Gửi OTP (TextFlow sẽ tự sinh mã và gửi SMS)
    await textflow.sendVerificationSMS(phone, {
      service_name: "My App",  // tên dịch vụ hiển thị trong SMS
      seconds: 300             // thời hạn mã OTP (5 phút)
    });

    res.json({ success: true, message: "OTP sent via TextFlow" });
  } catch (err) {
    console.error("sendOTP error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Xác minh OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ message: "Missing phone/code" });

    const result = await textflow.verifyCode(phone, code);

    if (result.valid) {
      res.json({ success: true, message: "OTP verified" });
    } else {
      res.status(400).json({ success: false, message: "Invalid OTP" });
    }
  } catch (err) {
    console.error("verifyOTP error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// gửi mã xác thực về email
exports.sendEmailVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Missing email" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    emailVerificationCodes[email] = code;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER, // Gmail
        pass: process.env.SMTP_PASS, // App password Gmail
      },
    });

    await transporter.sendMail({
      from: `"NutriAI" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Verify your email",
      text: `Your verification code is: ${code}`,
      html: `<h2>Email Verification</h2>
             <p>Your code is <b>${code}</b></p>`,
    });

    res.json({ success: true, message: "Verification code sent to email" });
  } catch (err) {
    console.error("sendEmailVerification error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// xác minh mã
exports.verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: "Missing email/code" });

    if (emailVerificationCodes[email] && emailVerificationCodes[email] === code) {
      // Xoá mã sau khi dùng
      delete emailVerificationCodes[email];

      // update DB
      await Auth.updateOne({ email }, { $set: { emailVerified: true } });

      return res.json({ success: true, message: "Email verified successfully" });
    } else {
      return res.status(400).json({ success: false, message: "Invalid code" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// gửi OTP xác nhận đổi email
exports.changeEmail = async (req, res) => {
  try {
    const { oldEmail, newEmail } = req.body;
    if (!oldEmail || !newEmail) return res.status(400).json({ message: "Missing old/new email" });

    // kiểm tra email mới đã tồn tại chưa
    const existed = await Auth.findOne({ email: newEmail });
    if (existed) return res.status(409).json({ message: "New email already in use" });

    // tạo mã OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    emailChangeCodes[oldEmail] = { code, newEmail };

    // gửi OTP về email cũ
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"NutriAI" <${process.env.SMTP_USER}>`,
      to: oldEmail,
      subject: "Confirm your email change",
      text: `Your code to change email is: ${code}`,
      html: `<p>Your code to change email is <b>${code}</b></p>`,
    });

    res.json({ success: true, message: "Verification code sent to current email" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.confirmEmailChange = async (req, res) => {
  try {
    const { oldEmail, code } = req.body;
    if (!oldEmail || !code) return res.status(400).json({ message: "Missing fields" });

    const record = emailChangeCodes[oldEmail];
    if (!record || record.code !== code) {
      return res.status(400).json({ message: "Invalid code" });
    }

    // cập nhật email mới
    const auth = await Auth.findOneAndUpdate(
      { email: oldEmail },
      { $set: { email: record.newEmail, emailVerified: false } },
      { new: true }
    );

    delete emailChangeCodes[oldEmail];

    if (!auth) return res.status(404).json({ message: "User not found" });

    // gửi OTP verify đến email mới
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    emailVerificationCodes[auth.email] = verifyCode;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"NutriAI" <${process.env.SMTP_USER}>`,
      to: auth.email,
      subject: "Verify your new email",
      text: `Your verification code is: ${verifyCode}`,
    });

    res.json({ success: true, message: "Email updated. Please verify new email." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ====== CHECK PHONE ======
exports.checkPhone = async (req, res) => {
  try {
    const { phone } = req.body || {};
    if (!phone) {
      return res.status(400).json({ message: "Missing phone" });
    }

    const existed = await Auth.findOne({ phone });
    if (existed) {
      return res.json({ exists: true });
    }
    return res.json({ exists: false });
  } catch (err) {
    return res.status(500).json({ message: "Check phone failed", error: err.message });
  }
};

// ====== CHECK EMAIL ======
exports.checkEmail = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ message: "Missing email" });
    }

    const existed = await Auth.findOne({ email: email.toLowerCase() });
    if (existed) {
      return res.json({ exists: true });
    }
    return res.json({ exists: false });
  } catch (err) {
    return res.status(500).json({ message: "Check email failed", error: err.message });
  }
};