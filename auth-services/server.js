const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const requestLogger = require("./middlewares/requestLogger"); 
dotenv.config({ path: "../.env" });
connectDB();

const app = express();
app.use(cors());
app.use(express.json());
app.use(requestLogger("Auth-service"));
// Routes
app.use("/", require("./routes/authRoutes"));

const PORT = process.env.AUTH_PORT ;
app.listen(PORT, () => console.log(` ------Auth-Service running on port ${PORT}-------------\n`));

// https://localhost:5005/login