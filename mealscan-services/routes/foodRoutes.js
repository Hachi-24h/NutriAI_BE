const express = require("express");
const router = express.Router();
const foodController = require("../controllers/foodController");

router.get("/search", foodController.searchFoodList);
router.get("/detail", foodController.getFoodDetail);
router.get("/featured", foodController.getFeaturedFoods);
router.get("/random", foodController.getRandomFoods);
router.post("/foods-analyze-batch", foodController.analyzeFoodsBatch);

module.exports = router;
