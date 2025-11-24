const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const requestLogger = require("./middlewares/requestLogger");
dotenv.config({ path: "../.env" });
connectDB();

const app = express();
app.use(cors());
app.use(requestLogger("Meals-service")); 
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/", require("./routes/mealsScheduleRoutes"));


const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`🚀 Meals Service running on port ${PORT}`));
