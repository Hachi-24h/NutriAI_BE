const express = require("express");
const router = express.Router();
const { createReview, getReviews } = require("../controllers/reviewController");

// API thêm review
router.post("/create", createReview);

// API lấy tất cả review
router.get("/getAll", getReviews);

module.exports = router;
