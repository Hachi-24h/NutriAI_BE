const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

dotenv.config();
connectDB(); // <-- Kết nối database

const app = express();
app.use(cors());
app.use(express.json());

// Routes

app.use("/user", require("./routes/userRoutes"));
app.use("/medical", require("./routes/medicalRecordRoutes"));
const internalUsers = require('./routes/internalUsers');
app.use('/internal/users', internalUsers);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
