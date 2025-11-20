const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/scheduleController");
const requireAuth = require("../middlewares/requireAuth");
router.post("/create-schedule",requireAuth, ctrl.createFullSchedule);
router.get("/get-schedule/:id", requireAuth, ctrl.getFullSchedule);
router.get("/get-me", requireAuth, ctrl.getSchedulesByUser); 
router.get("/next-meal", requireAuth, ctrl.getNextMealInCurrentSchedule);
router.post("/prepare-schedule", ctrl.enrichScheduleBeforeCreate);

// 🆕 Chia sẻ lịch
router.post("/share/:scheduleId", requireAuth, ctrl.shareScheduleToUser);

// 🆕 B chấp nhận share
router.post("/accept-share", requireAuth, ctrl.acceptShareTemplate);


module.exports = router;
