const express = require("express");
const router = express.Router();

router.post("/increment", (req, res) => {
  console.log("📌 Admin received log:", req.body);
  res.json({ message: "ok" });
});

module.exports = router;
