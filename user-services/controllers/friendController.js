const Friend = require("../models/friendModel");

let io;

// Gắn socket instance để emit realtime
exports.setSocketIO = (socketInstance) => {
  io = socketInstance;
  console.log("✅ [FRIEND] Socket.IO attached");
};

/* =========================================================
 📩 GỬI LỜI MỜI KẾT BẠN
========================================================= */
exports.sendFriendRequest = async (req, res) => {
  try {
    const { requesterId, receiverId } = req.body;

    if (!requesterId || !receiverId)
      return res.status(400).json({ message: "Missing requesterId or receiverId" });

    if (requesterId === receiverId)
      return res.status(400).json({ message: "Cannot send friend request to yourself" });

    // Nếu đã có quan hệ bạn bè hoặc pending
    const existing = await Friend.findOne({
      requester: requesterId,
      receiver: receiverId,
      status: { $in: ["PENDING", "ACCEPTED"] },
    });

    if (existing)
      return res.status(400).json({ message: "Request already sent or already friends" });

    const newRequest = await Friend.create({
      requester: requesterId,
      receiver: receiverId,
      status: "PENDING",
    });

    console.log("📨 [FRIEND] New request from:", requesterId, "→", receiverId);

    if (io) io.to(receiverId).emit("friend_request", { from: requesterId });

    res.status(201).json({ message: "✅ Friend request sent", data: newRequest });
  } catch (err) {
    console.error("❌ [FRIEND] sendFriendRequest Error:", err);
    res.status(500).json({ message: "Send friend request failed", error: err.message });
  }
};

/* =========================================================
 ✅ CHẤP NHẬN LỜI MỜI (cho phép 2 chiều)
========================================================= */
exports.acceptFriendRequest = async (req, res) => {
  try {
    const { requesterId, receiverId } = req.body;

    // Tìm request ở 2 chiều
    const request = await Friend.findOneAndUpdate(
      {
        status: "PENDING",
        $or: [
          { requester: requesterId, receiver: receiverId },
          { requester: receiverId, receiver: requesterId }
        ]
      },
      { status: "ACCEPTED" },
      { new: true }
    );

    if (!request)
      return res.status(404).json({ message: "Friend request not found" });

    console.log("✅ [FRIEND] Accepted:", requesterId, "↔", receiverId);

    // Emit cho cả hai user
    if (io) {
      io.to(requesterId).emit("friend_accepted", { by: receiverId });
      io.to(receiverId).emit("friend_accepted", { by: requesterId });
    }

    res.status(200).json({ message: "Friend request accepted", data: request });
  } catch (err) {
    console.error("❌ [FRIEND] acceptFriendRequest Error:", err);
    res.status(500).json({ message: "Accept failed", error: err.message });
  }
};

/* =========================================================
 ❌ TỪ CHỐI LỜI MỜI (cho phép 2 chiều)
========================================================= */
exports.rejectFriendRequest = async (req, res) => {
  try {
    const { requesterId, receiverId } = req.body;

    const request = await Friend.findOneAndUpdate(
      {
        status: "PENDING",
        $or: [
          { requester: requesterId, receiver: receiverId },
          { requester: receiverId, receiver: requesterId }
        ]
      },
      { status: "REJECTED" },
      { new: true }
    );

    if (!request)
      return res.status(404).json({ message: "Friend request not found" });

    console.log("❌ [FRIEND] Rejected:", requesterId, "↔", receiverId);

    if (io) {
      io.to(requesterId).emit("friend_rejected", { by: receiverId });
      io.to(receiverId).emit("friend_rejected", { by: requesterId });
    }

    res.status(200).json({ message: "Friend request rejected", data: request });
  } catch (err) {
    console.error("❌ [FRIEND] rejectFriendRequest Error:", err);
    res.status(500).json({ message: "Reject failed", error: err.message });
  }
};


/* =========================================================
 🚫 HỦY KẾT BẠN
========================================================= */
exports.unfriend = async (req, res) => {
  try {
    const { userId, friendId } = req.body;

    const friendship = await Friend.findOneAndDelete({
      status: "ACCEPTED",
      $or: [
        { requester: userId, receiver: friendId },
        { requester: friendId, receiver: userId },
      ],
    });

    if (!friendship)
      return res.status(404).json({ message: "Friendship not found" });

    console.log("🚫 [FRIEND] Unfriended:", userId, "↔", friendId);

    if (io) {
      io.to(friendId).emit("friend_removed", { by: userId });
      io.to(userId).emit("friend_removed", { by: friendId });
    }

    res.status(200).json({ message: "Unfriended successfully" });
  } catch (err) {
    res.status(500).json({ message: "Unfriend failed", error: err.message });
  }
};

/* =========================================================
 📜 DANH SÁCH BẠN BÈ
========================================================= */
exports.getFriends = async (req, res) => {
  try {
    const { userId } = req.params; // ví dụ: /friend/list/:userId

    const friends = await Friend.find({
      status: "ACCEPTED",
      $or: [{ requester: userId }, { receiver: userId }],
    });

    const friendIds = friends.map((f) =>
      f.requester === userId ? f.receiver : f.requester
    );

    res.status(200).json({ userId, friends: friendIds });
  } catch (err) {
    res.status(500).json({ message: "Get friends failed", error: err.message });
  }
};

/* =========================================================
 🕒 DANH SÁCH LỜI MỜI ĐANG CHỜ
========================================================= */
exports.getPendingRequests = async (req, res) => {
  try {
    const { userId } = req.params; // ví dụ: /friend/pending/:userId

    const requests = await Friend.find({
      status: "PENDING",
      receiver: userId,
    });

    res.status(200).json({ pending: requests });
  } catch (err) {
    res.status(500).json({ message: "Get pending failed", error: err.message });
  }
};
