const mongoose = require("mongoose");

const FriendSchema = new mongoose.Schema(
  {
    requester: { type: String, required: true }, // userId người gửi
    receiver: { type: String, required: true },  // userId người nhận
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

// ✅ Không cho trùng cặp requester-receiver
FriendSchema.index({ requester: 1, receiver: 1 }, { unique: true });

module.exports = mongoose.model("Friend", FriendSchema);
