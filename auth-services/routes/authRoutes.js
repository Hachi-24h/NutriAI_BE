// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const authCtrl = require("../controllers/authController");
const requireAuth = require("../middlewares/requireAuth");
router.post("/register", authCtrl.register);
router.post("/login", authCtrl.login);
router.post("/google", authCtrl.loginWithGoogle);
router.post("/refresh", authCtrl.refresh);
router.post("/logout", authCtrl.logout);
router.post("/change-password", authCtrl.resetPasswordByPhone);

router.get("/me", requireAuth, authCtrl.getMe);
module.exports = router;