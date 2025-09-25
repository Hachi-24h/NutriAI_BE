const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Static: để FE load ảnh trực tiếp
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/meals", require("./routes/mealsRoutes"));

const PORT = process.env.PORT || 5007;
app.listen(PORT, () => console.log(`🚀 Meals Service running on port ${PORT}`));
