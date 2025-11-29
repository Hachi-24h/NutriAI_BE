const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const requestLogger = require("./middlewares/requestLogger");
dotenv.config({ path: "../.env" });

const { getScheduleStatistics } = require("./controllers/scheduleController");
const { getScheduleResultStatistics } = require("./controllers/scheduleResultController");

connectDB();

const app = express();

// Middleware
app.use(requestLogger("schedule-service"));
app.use(cors());
app.use(express.json());

// =====================
// ROUTES
// =====================

// 📊 Stats routes
app.get("/schedule-result/stats", getScheduleResultStatistics);
app.use("/stats", getScheduleStatistics);

// 🧭 Main routes
app.use("/result", require("./routes/scheduleResultRoutes"));
app.use("/Ai-schedule", require("./routes/AiSchedule"));
app.use("/", require("./routes/scheduleRoutes"));

// =====================
// START SERVER
// =====================
const PORT = process.env.SCHEDULE_PORT ;
app.listen(PORT, () => console.log(`🚀 SCHEDULE-Service running on port ${PORT}`));
