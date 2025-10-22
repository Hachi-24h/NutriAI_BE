// routes/meals.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/mealsController');

router.post("/create-meal-templates", ctrl.createMealTemplate);
router.get("/get-meal-templates/:id", ctrl.getMealTemplate);

export default router;