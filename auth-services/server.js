const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const requestLogger = require("./middlewares/requestLogger"); 
dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());
app.use(requestLogger("Auth-service"));
// Routes
app.use("/auth", require("./routes/authRoutes"));
app.use("/internal", require("./routes/internalRoutes"));

const PORT = process.env.PORT || 5005;
app.listen(PORT, () => console.log(` ------Auth-Service running on port ${PORT}-------------\n`));
