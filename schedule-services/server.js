const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/goal", require("./routes/goalsRoutes"));
app.use("/schedule", require("./routes/scheduleRoutes"));
app.use("/schedule-result", require("./routes/scheduleResultRoutes"));

const PORT = process.env.PORT || 5003;
app.listen(PORT, () => console.log(`🚀 Schedule Service running on port ${PORT}`));
