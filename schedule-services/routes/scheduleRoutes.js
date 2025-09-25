import express from "express";
import { generateSchedule } from "../controllers/scheduleController.js";

const router = express.Router();

router.post("/generate", generateSchedule);

export default router;