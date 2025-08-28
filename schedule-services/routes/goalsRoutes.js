const express = require("express");
const router = express.Router();
const { createGoals, getGoals } = require("../controllers/goalsController");

router.post("/create", createGoals);
router.get("/getAll", getGoals);

module.exports = router;
