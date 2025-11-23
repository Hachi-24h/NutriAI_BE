const express = require("express");
const router = express.Router();
const friendController = require("../controllers/friendController");
const requireAuth = require("../middlewares/requireAuth");

// Tất cả routes đều cần token
router.post("/send", requireAuth, friendController.sendFriendRequest);
router.post("/accept", requireAuth, friendController.acceptFriendRequest);
router.post("/reject", requireAuth, friendController.rejectFriendRequest);
router.delete("/unfriend", requireAuth, friendController.unfriend);
router.get("/list", requireAuth, friendController.getFriends);
router.get("/pending", requireAuth, friendController.getPendingRequests);

module.exports = router;
