import express from "express";
const router = express.Router();
const  ctrl = require("../controllers/scheduleController.js");



router.post("/create-schedule", ctrl.createSchedule);
router.get("/:id/full", ctrl.getFullSchedule);
router.post("/create-schedule-full", ctrl.createFullScheduleFlow);
export default router;
