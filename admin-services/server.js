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
app.use("/admin", require("./routes/adminRoutes"));
app.use("/admin-log", require("./routes/requestStatsRoutes"));
const PORT = process.env.PORT || 5010;
app.listen(PORT, () => console.log(`🚀 Admin Service running on port ${PORT}`));
