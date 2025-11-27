const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/scheduleController");
const requireAuth = require("../middlewares/requireAuth");
router.post("/create-schedule",requireAuth, ctrl.createFullSchedule);
router.get("/get-schedule/:id", requireAuth, ctrl.getFullSchedule);
router.get("/get-me", requireAuth, ctrl.getSchedulesByUser); 
router.get("/next-meal", requireAuth, ctrl.getNextMealInCurrentSchedule);
router.post("/prepare-schedule", ctrl.enrichScheduleBeforeCreate);

router.delete("/delete/:scheduleId", requireAuth, ctrl.deleteSchedule);

router.patch("/stop/:scheduleId", requireAuth, ctrl.stopSchedule);
router.patch("/complete/:scheduleId", requireAuth, ctrl.completeSchedule);
module.exports = router;
