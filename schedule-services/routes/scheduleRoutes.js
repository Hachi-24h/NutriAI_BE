const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/scheduleController");
const requireAuth = require("../middlewares/requireAuth");
router.post("/create-schedule",requireAuth, ctrl.createFullSchedule);
router.get("/:id/get-schedule",requireAuth, ctrl.getFullSchedule);
router.get("/get-me", requireAuth, ctrl.getSchedulesByUser); 

module.exports = router;
