const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const http = require("http");



const requestLogger = require("./middlewares/requestLogger");
const { getUserStats } = require("./controllers/userController");
dotenv.config();
connectDB(); // <-- Kết nối database

const app = express();
app.use(cors());
app.use(requestLogger("User-service")); // 👈 thêm dòng này
app.use(express.json());
const server = http.createServer(app);
// Routes

// ✅ Route /user/stats KHÔNG bị requireAuth
app.get("/user/stats", getUserStats);

app.use("/", require("./routes/userRoutes"));
const internalUsers = require('./routes/internalUsers');

app.use('/internal/users', internalUsers);
const PORT = process.env.PORT || 5001;


server.listen(PORT, () => console.log(`🚀 User-Service running with realtime on port ${PORT}`));

