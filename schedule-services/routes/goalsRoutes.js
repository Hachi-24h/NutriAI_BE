const express = require("express");
const router = express.Router();
const goalctrl= require("../controllers/goalsController");

router.post("/create", goalctrl.createGoals);
router.get("/getAll", goalctrl.getGoals);


module.exports = router;
