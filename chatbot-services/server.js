import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import chatbotRoutes from "./routes/chatbotRoutes.js";
const requestLogger = require("./middlewares/requestLogger");
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(requestLogger("ChatBot-service"));
app.use("/api/chatbot", chatbotRoutes);

const PORT = process.env.PORT || 5010;
app.listen(PORT, () => console.log(`🤖 ChatBot service running on port ${PORT}`));
