// routes/scheduleResultRoutes.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/scheduleResultController");
const requireAuth = require("../middlewares/requireAuth");

// 🧾 Gửi đánh giá sau khi hoàn thành lịch
router.post("/submit/:scheduleId", requireAuth, ctrl.submitScheduleResult);

// 📋 Lấy toàn bộ đánh giá của user hiện tại
router.get("/my-results", requireAuth, ctrl.getResultsByUser);

// 🔍 Lấy chi tiết một đánh giá cụ thể
router.get("/:id", requireAuth, ctrl.getResultById);

// ❌ Xóa đánh giá (nếu cần)
router.delete("/:id", requireAuth, ctrl.deleteResult);

// 🧭 Lấy kết quả đánh giá theo scheduleId
router.post("/by-schedule", requireAuth, ctrl.getResultByScheduleId);



module.exports = router;
