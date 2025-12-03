import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import chatbotRoutes from "./routes/chatbotRoutes.js";
import requestLogger from "./middlewares/requestLogger.js";
dotenv.config({ path: "../.env" });

const app = express();
app.use(cors());
app.use(express.json());
app.use(requestLogger("ChatBot-service"));
app.use("/", chatbotRoutes);

const PORT = process.env.CHATBOT_PORT;
app.listen(PORT, () => console.log(`🤖 ChatBot service running on port ${PORT}`));
