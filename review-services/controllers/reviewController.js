const Review = require("../models/Review");

// Thêm review
exports.createReview = async (req, res) => {
  try {
    const { user, ratting, reviewText, reviewDate, sugest } = req.body;

    const newReview = new Review({
      user,
      ratting,
      reviewText,
      reviewDate,
      sugest
    });

    const savedReview = await newReview.save();
    res.status(201).json(savedReview);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Lấy tất cả review
exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find().populate("user"); 
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
