const Notification = require("../models/Notification");

// Lấy tất cả thông báo
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find();
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Tạo thông báo mới
exports.createNotification = async (req, res) => {
  const { notiID, typeNoti, isRead, date, content } = req.body;

  try {
    const newNoti = new Notification({
      notiID,
      typeNoti,
      isRead,
      date,
      content
    });

    const savedNoti = await newNoti.save();
    res.status(201).json(savedNoti);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


// Đánh dấu đã đọc
exports.markAsRead = async (req, res) => {
  try {
    const noti = await Notification.findById(req.params.id);
    if (!noti) return res.status(404).json({ message: "Notification not found" });

    noti.isRead = true;
    await noti.save();

    res.json(noti);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Xóa thông báo
exports.deleteNotification = async (req, res) => {
  try {
    const noti = await Notification.findByIdAndDelete(req.params.id);
    if (!noti) return res.status(404).json({ message: "Notification not found" });

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
