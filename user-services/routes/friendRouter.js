const express = require("express");
const router = express.Router();
const friendController = require("../controllers/friendController");

router.post("/send", friendController.sendFriendRequest);
router.post("/accept", friendController.acceptFriendRequest);
router.post("/reject", friendController.rejectFriendRequest);
router.delete("/unfriend", friendController.unfriend);
router.get("/list/:userId", friendController.getFriends);
router.get("/pending/:userId", friendController.getPendingRequests);

module.exports = router;
