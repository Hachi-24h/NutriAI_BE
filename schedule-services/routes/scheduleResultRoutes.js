const express = require("express");
const router = express.Router();
const { createScheduleResult, getScheduleResults } = require("../controllers/scheduleResultController");

router.post("/create", createScheduleResult);
router.get("/getAll", getScheduleResults);

module.exports = router;
