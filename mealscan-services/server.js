const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const requestLogger = require("./middlewares/requestLogger");
dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(requestLogger("MealScan-service"));
app.use(express.json());

app.use("/", require("./routes/mealsScanRoutes"));
app.use("/food", require("./routes/foodRoutes"));

const PORT = process.env.MEALSCAN_PORT ;
app.listen(PORT, () => console.log(`🚀 MealScan Service running on port ${PORT}`));
