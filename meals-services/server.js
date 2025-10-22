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
app.use("/meal", require("./routes/mealsRoutes"));

const PORT = process.env.PORT || 5007;
app.listen(PORT, () => console.log(`🚀 Review Service running on port ${PORT}`));
