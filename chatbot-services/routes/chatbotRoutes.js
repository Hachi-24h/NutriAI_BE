import express from "express";
import { handleChat } from "../controllers/chatbotController.js";

const router = express.Router();

router.post("/question", handleChat);

export default router;
