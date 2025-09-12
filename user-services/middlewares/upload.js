const multer = require("multer");

// Dùng memory storage để giữ file trong RAM
const storage = multer.memoryStorage();
const upload = multer({ storage });

module.exports = upload;
