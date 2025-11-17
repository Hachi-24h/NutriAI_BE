const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const requestLogger = require("./middlewares/requestLogger"); // 👈 thêm dòng này
dotenv.config();
const { getScheduleStatistics } = require("./controllers/scheduleController");
const { getScheduleResultStatistics } = require("./controllers/scheduleResultController");
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// ✅ Lưu global socket instance để emit ở controller
global._io = io;
app.use(requestLogger("schedule-service")); // 👈 thêm dòng này
app.use(cors());
app.use(express.json());

// Routes
// ✅ Route /user/stats KHÔNG bị requireAuth
app.get("/schedule-result/stats", getScheduleResultStatistics);
app.use("/schedule/stats" ,getScheduleStatistics);


app.use("/schedule", require("./routes/scheduleRoutes"));
app.use("/Ai-schedule", require("./routes/AiSchedule"));

const PORT = process.env.PORT || 5003;
server.listen(PORT, () => console.log(`🚀 SCHEDULE-Service running on port ${PORT}`));
