const express = require("express");
const router = express.Router();
const requireAuth = require("../middlewares/requireAuth");
const userCtrl = require("../controllers/userController");
router.get("/all",  userCtrl.getUsers);
router.get("/me", requireAuth, userCtrl.getMe);
router.post("/create", requireAuth, userCtrl.createUser);
router.get("/:id", requireAuth, userCtrl.getUserById);
router.put("/update-info", requireAuth, userCtrl.updateUser);
router.patch("/update-avatar", requireAuth, userCtrl.updateAvatar);

module.exports = router;
