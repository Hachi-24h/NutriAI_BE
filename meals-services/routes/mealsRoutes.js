// routes/meals.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/mealsController');

router.post('/create', ctrl.createMeals);
router.get('/getAll', ctrl.getAllMeals);

router.post('/createTime', ctrl.createMealsTime);
router.get('/getAllTime', ctrl.getAllMealsTime);

router.post('/createDate', ctrl.createDateMeals);
router.get('/getAllDate', ctrl.getAllDateMeals);

module.exports = router;
