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
router.post("/check-availability", authCtrl.checkAvailability);
router.get("/all", authCtrl.getAll);
router.post("/login-fingerprint", authCtrl.loginWithFingerprint);
router.post("/check-credentials", authCtrl.checkCredentials);
router.post("/link-google", requireAuth, authCtrl.linkGoogle);
router.post("/link-phone", requireAuth, authCtrl.linkPhone);
// router.post("/change-password-email", authCtrl.resetPasswordByEmail);



// router.post("/send-email-verification", authCtrl.sendEmailVerification);
// router.post("/verify-email", authCtrl.verifyEmail);

// router.post("/request-email-change", authCtrl.changeEmail);
// router.post("/confirm-email-change", authCtrl.confirmEmailChange);

// // check phone/email exist
// router.post("/check-phone", authCtrl.checkPhone);
// router.post("/check-email", authCtrl.checkEmail);

router.get("/me", requireAuth, authCtrl.getMe);

module.exports = router;
