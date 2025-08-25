const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  typeNoti: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  date: { type: Date, default: Date.now },
  content: { type: String, required: true },

  // lưu _id của User
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

module.exports = mongoose.model("Notification", NotificationSchema);
