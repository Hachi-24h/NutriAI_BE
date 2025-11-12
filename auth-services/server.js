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

const PORT = process.env.PORT || 5006;
app.listen(PORT, () => console.log(` ------Auth-Service running on port ${PORT}-------------\n`));
