// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const authCtrl = require("../controllers/authController");

router.post("/register", authCtrl.register);
router.post("/login", authCtrl.login);
router.post("/google", authCtrl.loginWithGoogle);
module.exports = router;