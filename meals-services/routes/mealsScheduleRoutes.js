const express = require("express");
const ctrl = require("../controllers/mealsScheduleController");
const requireAuth = require("../middlewares/requireAuth");
const router = express.Router();

router.post("/meal-templates",requireAuth, ctrl.createMealTemplate);
router.get("/meal-templates/:id",requireAuth, ctrl.getMealTemplate);

router.get("/meal-templates/all",requireAuth, ctrl.getAllMealTemplatesByUser);
module.exports = router;

