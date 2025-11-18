const express = require("express");
const router = express.Router();
const requireAuth = require("../middlewares/requireAuth");
const userCtrl = require("../controllers/userController");
const upload = require("../middlewares/upload");
router.get("/all",  userCtrl.getUsers);
router.get("/me", requireAuth, userCtrl.getMe);
router.post("/create", requireAuth, userCtrl.createUser);
// router.get("/:id", requireAuth, userCtrl.getUserById);
router.put("/update-info", requireAuth, userCtrl.updateUserInfo)
router.put("/update-health", requireAuth, userCtrl.updateUserHealth);

router.patch("/update-avatar",requireAuth, upload.single("file"), userCtrl.uploadAndUpdateAvatar);

router.get("/stats", userCtrl.getUserStats);

router.post("/get-by-authid", requireAuth, userCtrl.getUserByAuthId);

module.exports = router;
