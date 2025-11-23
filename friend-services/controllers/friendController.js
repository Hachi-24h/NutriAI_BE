const Friend = require("../models/friendModel");
let io;
const axios = require("axios");

let USER_SERVICE_URL =
  process.env.IS_DOCKER === "true"
    ? process.env.USER_SERVICE_URL_DOCKER
    : process.env.USER_SERVICE_URL_LOCAL;

// Gán Socket
exports.setSocketIO = (socketInstance) => {
  io = socketInstance;
};

/* ============================================================
   🟢 Gửi lời mời kết bạn
   ============================================================ */
exports.sendFriendRequest = async (req, res) => {
  try {
    const requesterId = req.auth?.id;
    const { receiverId } = req.body;

    if (!receiverId)
      return res.status(400).json({ message: "Thiếu receiverId" });

    if (requesterId === receiverId)
      return res
        .status(400)
        .json({ message: "Không thể gửi lời mời cho chính mình 😅" });

    // Kiểm tra trùng cả 2 chiều
    const existing = await Friend.findOne({
      status: { $in: ["PENDING", "ACCEPTED"] },
      $or: [
        { requester: requesterId, receiver: receiverId },
        { requester: receiverId, receiver: requesterId },
      ],
    });

    if (existing)
      return res
        .status(400)
        .json({ message: "Đã gửi lời mời hoặc đã là bạn bè rồi" });

    const newRequest = await Friend.create({
      requester: requesterId,
      receiver: receiverId,
      status: "PENDING",
    });

    if (io)
      io.to(receiverId).emit("friend_request", { from: requesterId });

    return res.status(201).json({
      message: "✅ Đã gửi lời mời kết bạn",
      data: newRequest,
    });
  } catch (err) {
    console.error("❌ [FRIEND] sendFriendRequest:", err);
    res.status(500).json({ message: "Lỗi gửi lời mời", error: err.message });
  }
};

/* ============================================================
   🟢 Chấp nhận lời mời kết bạn
   ============================================================ */
exports.acceptFriendRequest = async (req, res) => {
  try {
    const receiverId = req.auth?.id;
    const { requesterId } = req.body;

    if (!requesterId)
      return res.status(400).json({ message: "Thiếu requesterId" });

    // ❗ CHỈ CHO ACCEPT THEO CHIỀU ĐÚNG (requester → receiver)
    const request = await Friend.findOneAndUpdate(
      {
        requester: requesterId,
        receiver: receiverId,
        status: "PENDING",
      },
      { status: "ACCEPTED" },
      { new: true }
    );

    if (!request)
      return res
        .status(404)
        .json({ message: "Không tìm thấy lời mời cần chấp nhận" });

    // Emit realtime
    if (io) {
      io.to(requesterId).emit("friend_accepted", { by: receiverId });
      io.to(receiverId).emit("friend_accepted", { by: requesterId });

      // Sync danh sách
      io.to(requesterId).emit("new_friend", { friendId: receiverId });
      io.to(receiverId).emit("new_friend", { friendId: requesterId });
    }

    return res.status(200).json({
      message: "✅ Đã chấp nhận lời mời kết bạn",
      data: request,
    });
  } catch (err) {
    console.error("❌ [FRIEND] acceptFriendRequest:", err);
    res.status(500).json({ message: "Lỗi accept", error: err.message });
  }
};

/* ============================================================
   🟠 Từ chối lời mời
   ============================================================ */
exports.rejectFriendRequest = async (req, res) => {
  try {
    const receiverId = req.auth?.id;
    const { requesterId } = req.body;

    if (!requesterId)
      return res.status(400).json({ message: "Thiếu requesterId" });

    const request = await Friend.findOneAndUpdate(
      {
        requester: requesterId,
        receiver: receiverId,
        status: "PENDING",
      },
      { status: "REJECTED" },
      { new: true }
    );

    if (!request)
      return res
        .status(404)
        .json({ message: "Không tìm thấy lời mời" });

    if (io) {
      io.to(requesterId).emit("friend_rejected", { by: receiverId });
      io.to(receiverId).emit("friend_rejected", { by: requesterId });
    }

    return res.status(200).json({
      message: "🚫 Đã từ chối lời mời kết bạn",
      data: request,
    });
  } catch (err) {
    console.error("❌ [FRIEND] rejectFriendRequest:", err);
    res.status(500).json({ message: "Lỗi reject", error: err.message });
  }
};

/* ============================================================
   🔴 Hủy kết bạn
   ============================================================ */
exports.unfriend = async (req, res) => {
  try {
    const userId = req.auth?.id;
    const { friendId } = req.body;

    if (!friendId)
      return res.status(400).json({ message: "Thiếu friendId" });

    const friendship = await Friend.findOneAndDelete({
      status: "ACCEPTED",
      $or: [
        { requester: userId, receiver: friendId },
        { requester: friendId, receiver: userId },
      ],
    });

    if (!friendship)
      return res
        .status(404)
        .json({ message: "Không tìm thấy quan hệ bạn bè" });

    if (io) {
      io.to(userId).emit("friend_removed", { friendId });
      io.to(friendId).emit("friend_removed", { friendId: userId });
    }

    return res.status(200).json({ message: "✅ Đã hủy kết bạn" });
  } catch (err) {
    console.error("❌ [FRIEND] unfriend:", err);
    res.status(500).json({ message: "Lỗi unfriend", error: err.message });
  }
};

/* ============================================================
   🟢 Lấy danh sách bạn bè (không bị lệch chiều nữa)
   ============================================================ */
exports.getFriends = async (req, res) => {
  try {
    const userId = req.auth?.id;

    const friends = await Friend.find({
      status: "ACCEPTED",
      $or: [{ requester: userId }, { receiver: userId }],
    });

    if (!friends.length) {
      return res.status(200).json({
        message: "Không có bạn bè nào",
        friends: [],
      });
    }

    // ⭐ FIX: luôn lấy ID còn lại, convert về string để không sai kiểu
    const friendIds = friends.map((f) => {
      const reqId = f.requester.toString();
      const recId = f.receiver.toString();
      const uid = userId.toString();

      return reqId === uid ? recId : reqId;
    });

    // Lấy thông tin chi tiết bạn bè
    const friendDetails = [];
    for (const fid of friendIds) {
      try {
        const api = `${USER_SERVICE_URL}/get-by-authid`;
        console.log("🔹 Gọi USER SERVICE:", api);
        const resp = await axios.post(
          `${api}`,
          { authId: fid },
          { headers: { Authorization: req.headers.authorization } }
        );

        if (resp.data) friendDetails.push(resp.data);
      } catch (err) {
        console.warn(
          `⚠️ Không lấy được user ${fid}:`,
          err.response?.data?.message || err.message
        );
      }
    }

    res.status(200).json({
      message: "Danh sách bạn bè chi tiết",
      total: friendDetails.length,
      friends: friendDetails,
    });
  } catch (err) {
    console.error("❌ [FRIEND] getFriends:", err);
    res.status(500).json({
      message: "Lỗi lấy danh sách bạn bè",
      error: err.message,
    });
  }
};

/* ============================================================
   🟡 Lấy danh sách pending
   ============================================================ */
exports.getPendingRequests = async (req, res) => {
  try {
    const userId = req.auth?.id;

    const pending = await Friend.find({
      status: "PENDING",
      receiver: userId,
    });

    res.status(200).json({
      message: "Danh sách lời mời đang chờ",
      total: pending.length,
      requests: pending,
    });
  } catch (err) {
    console.error("❌ [FRIEND] getPendingRequests:", err);
    res.status(500).json({ message: "Lỗi lấy pending", error: err.message });
  }
};
