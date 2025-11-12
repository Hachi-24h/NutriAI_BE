const express = require("express");
const ctrl = require("../controllers/mealsScheduleController");
const requireAuth = require("../middlewares/requireAuth");
const router = express.Router();

router.post("/create-meal-templates",requireAuth, ctrl.createMealTemplate);
router.get("/get-meal-templates/:id",requireAuth, ctrl.getMealTemplate);

router.get("/meal-templates/getme",requireAuth, ctrl.getAllMealTemplatesByUser);
router.post("/share-template", requireAuth, ctrl.shareTemplateWithUser);
router.get("/shared-templates", requireAuth, ctrl.getSharedTemplates);
module.exports = router;

