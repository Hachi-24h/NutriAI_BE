const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/meals-scand", require("./routes/mealsScanRoutes"));
app.use("/meals-schedule", require("./routes/mealsScheduleRoutes"));
app.use("/foods", require("./routes/foodRoutes"));
app.use("/internal", require("./routes/internalRoutes"));

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`🚀 Meals Service running on port ${PORT}`));
