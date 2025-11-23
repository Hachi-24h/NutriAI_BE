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
app.use("/", require("./routes/adminRoutes"));

const PORT = process.env.PORT || 5010;
app.listen(PORT, () => console.log(`🚀 Admin Service running on port ${PORT}`));