const express = require("express");
const router = express.Router();
const foodController = require("../controllers/foodController");

router.get("/search", foodController.searchFoodList);
router.get("/detail", foodController.getFoodDetail);
router.get("/featured", foodController.getFeaturedFoods); // 🆕 thêm dòng này

module.exports = router;
