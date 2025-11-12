// controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Auth = require("../models/auth");
const RefreshToken = require("../models/RefreshToken");
const nodemailer = require("nodemailer");
const { OAuth2Client } = require("google-auth-library");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access-secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh-secret";
const ACCESS_TTL = "15m"; // 15 phút
const REFRESH_TTL_DAYS = 30; // 30 ngày
const axios = require('axios');
const OtpCode = require("../models/OtpCode");

const USER_SERVICE_BASE_URL = process.env.USER_SERVICE_BASE_URL;
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;
const otpStore = {};
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
    { sub: auth._id.toString(), phone: auth.phone, email: auth.email, role: auth.role, emailVerified: auth.emailVerified },
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
    const auth = await Auth.create({
      phone: phone.trim(),
      email: email ? email.toLowerCase().trim() : email,
      providers: [{ type: 'local', passwordHash }],
      biometric: false // 👈 thêm dòng này
    });

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

    const localProvider = auth.providers.find(p => p.type === 'local');
    if (!localProvider) return res.status(401).json({ message: "Local login not available" });

    const ok = await bcrypt.compare(password, localProvider.passwordHash || "");

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
    if (!id_token)
      return res.status(400).json({ message: "Missing id_token" });

    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub, email, name, picture, given_name, family_name } = ticket.getPayload();

    // 1️⃣ Tìm user theo providerId (google)
    let auth = await Auth.findOne({
      providers: { $elemMatch: { type: "google", providerId: sub } },
    });

    // 2️⃣ Nếu không tìm thấy theo provider, thử tìm theo email
    if (!auth && email) {
      const existed = await Auth.findOne({ email: email.toLowerCase() });

      // ✅ Nếu user tồn tại nhưng chưa link Google → chặn login
      if (existed) {
        return res.status(404).json({
          message: "Google account not linked to any existing account. Please link your Google account first.",
        });
      }
    }

    // 3️⃣ Nếu chưa có user nào cả → tạo mới bằng Google
    if (!auth) {
      auth = await Auth.create({
        email: email?.toLowerCase() || null,
        emailVerified: true,
        providers: [{ type: "google", providerId: sub }],
        email,
        providers: [{ type: 'google', providerId: sub }],
        biometric: false // 👈 thêm dòng này
      });
      console.log("🆕 Created new Google user:", email);
    }

    // 4️⃣ Sinh token
    const access_token = signAccessToken(auth);
    const refresh_token = signRefreshToken(auth);
    await saveRefreshToken(auth._id, refresh_token);

    // 5️⃣ Đảm bảo profile tồn tại
    await ensureUserProfile(auth._id.toString(), {
      fullname: name || `${given_name || ""} ${family_name || ""}`.trim() || null,
      gender: "OTHER",
      DOB: null,
      email: email || null,
      avatar: picture || null,
    });

    return res.json({
      access_token,
      refresh_token,
      token_type: "Bearer",
      expires_in: 900,
    });
  } catch (err) {
    console.error("Google login error:", err?.message);
    return res.status(401).json({
      message: "Google login failed. Invalid or expired token.",
      error: err.message,
    });
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
    const auth = await Auth.findById(req.auth.id);
    if (!auth) return res.status(404).json({ message: "User not found" });

    return res.json({
      id: auth.id,
      id: auth.id,
      email: auth.email,
      phone: auth.phone,
      role: auth.role,
      emailVerified: auth.emailVerified,
      providers: auth.providers,
      biometric: auth.biometric,
    });
  } catch (err) {
    return res.status(500).json({ message: "Get me failed", error: err.message });
  }
};

// change password by phone
exports.resetPasswordByPhone = async (req, res) => {
  try {
    const { phone, newPassword } = req.body || {};
    if (!phone || !newPassword) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ số điện thoại và mật khẩu mới." });
    }

    const auth = await Auth.findOne({ phone });
    if (!auth) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản với số điện thoại này." });
    }

    if (!auth.phone) {
      return res.status(400).json({ message: "Tài khoản của bạn chưa liên kết với số điện thoại nào." });
    }

    const localProvider = auth.providers.find(p => p.type === "local");
    if (!localProvider) {
      return res.status(400).json({ message: "Tài khoản này không hỗ trợ đổi mật khẩu bằng số điện thoại." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    localProvider.passwordHash = passwordHash;
    await auth.save();

    return res.json({ message: "✅ Mật khẩu đã được đổi thành công!" });
  } catch (err) {
    console.error("Reset Password Phone Error:", err);
    return res.status(500).json({ message: "Đã xảy ra lỗi hệ thống khi đổi mật khẩu. Vui lòng thử lại sau." });
  }
};

// ====== change password by email
exports.resetPasswordByEmail = async (req, res) => {
  try {
    const { email, newPassword } = req.body || {};
    if (!email || !newPassword) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ email và mật khẩu mới." });
    }

    const auth = await Auth.findOne({ email: email.toLowerCase() });
    if (!auth) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản với email này." });
    }

    // ⚠️ Chưa xác thực email
    if (!auth.emailVerified) {
      return res.status(403).json({ message: "Email này chưa được xác thực. Vui lòng xác thực email trước khi đặt lại mật khẩu." });
    }

    // 🔍 Tìm provider local
    let localProvider = auth.providers.find(p => p.type === "local");

    // Nếu user dùng Google mà đã xác thực email → tự tạo local provider
    if (!localProvider) {
      const hasGoogle = auth.providers.some(p => p.type === "google");
      if (hasGoogle) {
        localProvider = { type: "local" };
        auth.providers.push(localProvider);
      } else {
        return res.status(400).json({ message: "Tài khoản này không hỗ trợ đổi mật khẩu bằng email." });
      }
    }

    // 🔒 Mã hóa và lưu lại mật khẩu
    const passwordHash = await bcrypt.hash(newPassword, 12);
    localProvider.passwordHash = passwordHash;
    await auth.save();

    return res.json({ message: "✅ Mật khẩu đã được đặt lại thành công!" });
  } catch (err) {
    console.error("Reset Password Email Error:", err);
    return res.status(500).json({ message: "Đã xảy ra lỗi hệ thống khi đặt lại mật khẩu. Vui lòng thử lại sau." });
  }
};

exports.getAll = async (req, res) => {
  try {
    const auth = await Auth.find();  // lấy toàn bộ collection User
    res.json(auth);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// check phone/email availability
exports.checkAvailability = async (req, res) => {
  try {
    const { phone, email } = req.body || {};

    if (!phone && !email) {
      return res.status(400).json({ message: "Missing phone or email" });
    }

    const existed = await Auth.findOne({
      $or: [
        ...(phone ? [{ phone }] : []),
        ...(email ? [{ email: email.toLowerCase() }] : []),
      ],
    });

    if (existed) {
      return res.status(409).json({ message: "Phone or Email already exists" });
    }

    return res.json({ available: true, message: "Phone/Email is available" });
  } catch (err) {
    console.error("checkAvailability error:", err.message);
    return res.status(500).json({ message: "Check availability failed", error: err.message });
  }
};

exports.loginWithFingerprint = async (req, res) => {
  try {
    const { phone } = req.body || {};
    if (!phone) {
      return res.status(400).json({ message: "Missing phone" });
    }

    const auth = await Auth.findOne({ phone });
    if (!auth) {
      return res.status(404).json({ message: "Account not found" });
    }

    // 👉 Lúc này giả định FE đã xác thực vân tay, BE chỉ cần cấp token
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
    return res.status(500).json({ message: "Fingerprint login failed", error: err.message });
  }
};

// ====== CHECK PHONE + PASSWORD ======
exports.checkCredentials = async (req, res) => {
  try {
    const { phone, password } = req.body || {};
    if (!phone || !password) {
      return res.status(400).json({ message: "Missing phone or password" });
    }

    const auth = await Auth.findOne({ phone });
    if (!auth) {
      return res.status(404).json({ message: "Account not found" });
    }

    const localProvider = auth.providers.find(p => p.type === 'local');
    if (!localProvider) return res.status(401).json({ message: "Local login not available" });

    const ok = await bcrypt.compare(password, localProvider.passwordHash || "");

    if (!ok) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // Nếu đúng thì chỉ trả kết quả OK, không sinh token
    return res.json({
      success: true,
      message: "Phone & password valid"
    });
  } catch (err) {
    console.error("checkCredentials error:", err);
    return res.status(500).json({ message: "Check credentials failed", error: err.message });
  }
};

exports.linkGoogle = async (req, res) => {
  try {
    const { id_token } = req.body || {};
    if (!id_token) return res.status(400).json({ message: "Missing id_token" });

    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const { sub, email } = ticket.getPayload();

    const auth = await Auth.findById(req.auth.id);
    if (!auth) return res.status(404).json({ message: "User not found" });

    // ✅ Chặn nếu email chưa verify
    if (!auth.emailVerified) {
      return res.status(403).json({ message: "Please verify your email before linking Google account." });
    }

    const alreadyLinked = auth.providers.some(p => p.type === "google");
    if (alreadyLinked) {
      return res.status(400).json({ message: "Google account already linked" });
    }

    if (auth.email && auth.email !== email) {
      return res.status(400).json({
        message: "Google email must match your registered email"
      });
    }

    auth.providers.push({ type: "google", providerId: sub });
    await auth.save();

    return res.json({ message: "Google account linked successfully" });
  } catch (err) {
    console.error("Link Google error:", err.message);
    return res.status(500).json({ message: "Link Google failed", error: err.message });
  }
};

exports.linkPhone = async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ message: "Missing phone or password" });
    }

    // 1. Check phone đã tồn tại ở user khác chưa
    const existing = await Auth.findOne({ phone });
    if (existing) {
      return res.status(400).json({ message: "Phone number already in use" });
    }

    // 2. Lấy user hiện tại từ access token
    const auth = await Auth.findById(req.auth.id);
    if (!auth) return res.status(404).json({ message: "User not found" });

    // 3. Kiểm tra đã có local provider chưa
    const hasLocal = auth.providers.some(p => p.type === "local");
    if (hasLocal) {
      return res.status(400).json({ message: "Local account already linked" });
    }

    // 4. Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // 5. Cập nhật user: thêm phone + provider local
    auth.phone = phone;
    auth.providers.push({ type: "local", passwordHash });
    await auth.save();

    return res.json({ message: "Local account linked successfully" });
  } catch (err) {
    console.error("Link Local error:", err.message);
    return res.status(500).json({ message: "Link Local failed", error: err.message });
  }
};

exports.unlinkGoogle = async (req, res) => {
  try {
    const auth = await Auth.findById(req.auth.id);
    if (!auth) return res.status(404).json({ message: "User not found" });

    const hasGoogle = auth.providers.some(p => p.type === "google");
    if (!hasGoogle) {
      return res.status(400).json({ message: "Google account not linked" });
    }

    // Không cho unlink nếu là phương thức đăng nhập duy nhất
    if (auth.providers.length <= 1) {
      return res.status(400).json({ message: "Cannot unlink the only login method" });
    }

    // Xóa provider google
    auth.providers = auth.providers.filter(p => p.type !== "google");
    await auth.save();

    return res.json({ message: "✅ Google account unlinked successfully!" });
  } catch (err) {
    console.error("Unlink Google error:", err.message);
    res.status(500).json({ message: "Unlink Google failed", error: err.message });
  }
};

exports.unlinkPhone = async (req, res) => {
  try {
    const auth = await Auth.findById(req.auth.id);
    if (!auth) return res.status(404).json({ message: "User not found" });

    const hasLocal = auth.providers.some(p => p.type === "local");
    if (!hasLocal) {
      return res.status(400).json({ message: "Phone account not linked" });
    }

    if (auth.providers.length <= 1) {
      return res.status(400).json({ message: "Cannot unlink the only login method" });
    }

    // Xóa provider local + clear phone
    auth.providers = auth.providers.filter(p => p.type !== "local");
    auth.phone = null;
    await auth.save();

    return res.json({ message: "✅ Phone account unlinked successfully!" });
  } catch (err) {
    console.error("Unlink Phone error:", err.message);
    res.status(500).json({ message: "Unlink Phone failed", error: err.message });
  }
};

// gửi mã xác thực về email
exports.sendEmailVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Missing email" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // lưu vào DB, xóa code cũ nếu có
    await OtpCode.deleteMany({ email: email.toLowerCase() });
    await OtpCode.create({ email: email.toLowerCase(), code });

    // gửi email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"NutriAI" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Verify your email",
      text: `Your verification code is: ${code}`,
      html: `<h2>Email Verification</h2><p>Your code is <b>${code}</b></p>`,
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
    if (!email || !code)
      return res.status(400).json({ message: "Missing email/code" });

    const record = await OtpCode.findOne({ email: email.toLowerCase(), code });
    if (!record)
      return res.status(400).json({ success: false, message: "Invalid or expired code" });

    // ✅ Cập nhật emailVerified = true
    await Auth.updateOne(
      { email: email.toLowerCase() },
      { $set: { emailVerified: true } }
    );

    // Xoá code sau khi dùng
    await OtpCode.deleteMany({ email: email.toLowerCase() });

    // ✅ cập nhật user: set emailVerified = true
    const auth = await Auth.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $set: { emailVerified: true } },
      { new: true }
    );

    if (!auth) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({ success: true, message: "Email verified successfully", user: auth });
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

// ====== KIỂM TRA CÁCH ĐĂNG NHẬP (DÙNG TOKEN) ======
exports.checkLoginMethods = async (req, res) => {
  try {
    // id đã có sẵn trong req.auth nhờ requireAuth middleware
    const auth = await Auth.findById(req.auth.id);
    if (!auth) {
      return res.status(404).json({ message: "User not found" });
    }

    const methods = auth.providers.map(p => p.type);

    if (methods.length === 1) {
      return res.json({
        message: `User chỉ có 1 phương thức đăng nhập: ${methods[0]}`,
        methods
      });
    }

    if (methods.length === 2) {
      return res.json({
        message: "User có đủ 2 phương thức đăng nhập: local + google",
        methods
      });
    }

    return res.json({
      message: "User có nhiều phương thức đăng nhập",
      methods
    });
  } catch (err) {
    return res.status(500).json({ message: "Check login methods failed", error: err.message });
  }
};

exports.requestUnlink = async (req, res) => {
  try {
    const { type } = req.body; // "google" hoặc "phone"
    const auth = await Auth.findById(req.auth.id);
    if (!auth) return res.status(404).json({ message: "User not found" });

    if (type === "phone") {
      // unlink phone => gửi OTP về email Google
      const googleProvider = auth.providers.find(p => p.type === "google");
      if (!googleProvider || !auth.email) {
        return res.status(400).json({ message: "Google not linked" });
      }
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await OtpCode.deleteMany({ email: auth.email });
      await OtpCode.create({ email: auth.email, code });

      // gửi email
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
      await transporter.sendMail({
        from: `"NutriAI" <${process.env.SMTP_USER}>`,
        to: auth.email,
        subject: "Confirm unlink phone",
        text: `Your unlink code is: ${code}`
      });

      return res.json({ success: true, message: "OTP sent to Google email" });
    }

    if (type === "google") {
      // unlink google => gửi OTP về phone
      if (!auth.phone) {
        return res.status(400).json({ message: "Phone not linked" });
      }
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await OtpCode.deleteMany({ phone: auth.phone });
      await OtpCode.create({ phone: auth.phone, code });

      // TODO: gửi SMS qua service (Twilio / Viettel / Zalo…)
      console.log(`Send SMS to ${auth.phone}: code ${code}`);

      return res.json({ success: true, message: "OTP sent to phone" });
    }

    return res.status(400).json({ message: "Invalid type" });
  } catch (err) {
    console.error("requestUnlink error:", err.message);
    return res.status(500).json({ message: "Request unlink failed", error: err.message });
  }
};

exports.confirmUnlink = async (req, res) => {
  try {
    const { type, code } = req.body; // type = "google" hoặc "phone"
    const auth = await Auth.findById(req.auth.id);
    if (!auth) return res.status(404).json({ message: "User not found" });

    if (type === "phone") {
      // verify code qua email
      const record = await OtpCode.findOne({ email: auth.email, code });
      if (!record) return res.status(400).json({ message: "Invalid/expired code" });

      if (auth.providers.length <= 1)
        return res.status(400).json({ message: "Cannot unlink the only login method" });

      // xoá local provider + phone
      auth.providers = auth.providers.filter(p => p.type !== "local");
      auth.set("phone", undefined, { strict: false });
      auth.markModified("phone");
      await auth.save();

      await OtpCode.deleteMany({ email: auth.email });
      return res.json({ success: true, message: "Phone unlinked successfully" });
    }

    if (type === "google") {
      const record = await OtpCode.findOne({ phone: auth.phone, code });
      if (!record) return res.status(400).json({ message: "Invalid/expired code" });

      if (auth.providers.length <= 1)
        return res.status(400).json({ message: "Cannot unlink the only login method" });

      // xoá google provider
      auth.providers = auth.providers.filter(p => p.type !== "google");
      await auth.save();

      await OtpCode.deleteMany({ phone: auth.phone });
      return res.json({ success: true, message: "Google unlinked successfully" });
    }

    return res.status(400).json({ message: "Invalid type" });
  } catch (err) {
    console.error("confirmUnlink error:", err.message);
    return res.status(500).json({ message: "Confirm unlink failed", error: err.message });
  }
};

// ======= CAP NHẬT VÂN TAY =======
exports.updateBiometric = async (req, res) => {
  try {
    const userId = req.auth.id;

    // Lấy user hiện tại
    const user = await Auth.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Đảo ngược giá trị biometric (true -> false, false -> true)
    const newBiometricValue = !user.biometric;

    // Cập nhật vào DB
    await Auth.updateOne({ _id: userId }, { $set: { biometric: newBiometricValue } });

    // Trả về giá trị mới
    return res.json({
      success: true,
      message: "Biometric toggled successfully",
      biometric: newBiometricValue
    });
  } catch (err) {
    console.error("updateBiometric error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};