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
app.use("/review", require("./routes/reviewRoutes"));

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`🚀 Review Service running on port ${PORT}`));
