const express = require("express");
const router = express.Router();
const authCtrl = require("../controllers/authController");
const requireAuth = require("../middlewares/requireAuth");
const bcrypt = require("bcryptjs");
const Auth = require("../models/auth");

router.post("/register", authCtrl.register);
router.post("/login", authCtrl.login);
router.post("/google", authCtrl.loginWithGoogle);
router.post("/refresh", authCtrl.refresh);
router.post("/logout", authCtrl.logout);
router.post("/change-password", authCtrl.resetPasswordByPhone);
router.post("/check-availability", authCtrl.checkAvailability);
router.get("/all", authCtrl.getAll);
router.post("/login-fingerprint", authCtrl.loginWithFingerprint);
router.post("/check-credentials", authCtrl.checkCredentials);
router.post("/link-google", requireAuth, authCtrl.linkGoogle);
router.post("/unlink-google", requireAuth, authCtrl.unlinkGoogle);
router.post("/link-phone", requireAuth, authCtrl.linkPhone);
router.post("/unlink-phone", requireAuth, authCtrl.unlinkPhone);

router.post("/change-password-email", authCtrl.resetPasswordByEmail);

router.post("/send-email-verification", authCtrl.sendEmailVerification);
router.post("/verify-email", authCtrl.verifyEmail);

router.post("/request-email-change", authCtrl.changeEmail);
router.post("/confirm-email-change", authCtrl.confirmEmailChange);

router.post("/request-unlink", requireAuth, authCtrl.requestUnlink);   // gửi OTP
router.post("/confirm-unlink", requireAuth, authCtrl.confirmUnlink);   // nhập OTP để unlink

router.get("/me", requireAuth, authCtrl.getMe);
router.get("/check-login-methods", requireAuth, authCtrl.checkLoginMethods);
router.post("/update-biometric", requireAuth, authCtrl.updateBiometric);
router.get("/stats", authCtrl.stats);

router.post("/admin-register", requireAuth, async (req, res) => {
    try {
        const creator = await Auth.findById(req.auth._id);
  
      if (!creator || creator.role !== "admin") {
        return res.status(403).json({ message: "Only admin can create admin" });
      }
  
      if (!creator.isSuperAdmin) {
        req.body.isSuperAdmin = false;
      }
  
      const { phone, password } = req.body;
  
      if (!phone) {
        return res.status(400).json({ message: "Phone is required" });
      }
  
      const passwordHash = await bcrypt.hash(password, 10);
  
      const user = await Auth.create({
        phone: phone.trim(),
        providers: [{ type: "local", passwordHash }],
        role: "admin"
      });
  
      return res.status(201).json({ message: "Admin created", user });
  
    } catch (e) {
      res.status(500).json({
        message: "Admin register failed",
        error: e.message
      });
    }
  });
  
router.get("/admins", async (req, res) => {
    try {
        const admins = await Auth.find({ role: "admin" }).select("-providers.passwordHash");

        return res.json({ users: admins });
    } catch (e) {
        res.status(500).json({
            message: "Get admin list failed",
            error: e.message
        });
    }
});

router.delete("/admin/:id", async (req, res) => {
    try {
      const { id } = req.params;
  
      const admin = await Auth.findById(id);
  
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }
  
      if (admin.isSuperAdmin) {
        return res.status(403).json({
          message: "Super Admin cannot be deleted"
        });
      }
  
      await Auth.findByIdAndDelete(id);
  
      return res.json({ message: "Admin removed", user: admin });
  
    } catch (e) {
      res.status(500).json({
        message: "Delete admin failed",
        error: e.message
      });
    }
  });  

module.exports = router;

