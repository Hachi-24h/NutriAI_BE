const express = require("express");
const router = express.Router();
const Auth = require("../models/auth");
const axios = require("axios");
require("dotenv").config();

router.get("/users/:id", async (req, res) => {
  try {
    const auth = await Auth.findById(req.params.id).select(
      "email phone role emailVerified providers biometric createdAt"
    );
    if (!auth) return res.status(404).json({ message: "Auth not found" });

    // 🔹 Gọi sang USER SERVICE để lấy thông tin profile
    const USER_SERVICE_URL = process.env.USER_SERVICE_BASE_URL; 
    let userProfile = null;
    if (USER_SERVICE_URL) {
      try {
        const profileRes = await axios.get(`${USER_SERVICE_URL}/profile/${req.params.id}`);
        userProfile = profileRes.data;
      } catch (err) {
        console.warn("⚠️ Không lấy được profile:", err.message);
      }
    }

    res.json({
      auth,
      profile: userProfile,
    });
  } catch (err) {
    res.status(500).json({ message: "Get user failed", error: err.message });
  }
});

module.exports = router;
