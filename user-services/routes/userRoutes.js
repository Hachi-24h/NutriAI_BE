const express = require("express");
const router = express.Router();
const requireAuth = require("../middlewares/requireAuth");
const {
  getUsers,
  createUser,
  getUserById,
  deleteUser,
  getMe,
} = require("../controllers/userController");

// BẮT BUỘC token để lấy hồ sơ chính chủ
router.get("/me", requireAuth,  getMe);

// (tuỳ chọn) bảo vệ các route còn lại
router.get("/", requireAuth, getUsers);
router.post("/create", requireAuth, createUser);
router.get("/:id", requireAuth, getUserById);
router.delete("/:id", requireAuth, deleteUser);

module.exports = router;
