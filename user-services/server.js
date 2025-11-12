const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const http = require("http");
const { Server } = require("socket.io");
const friendController = require("./controllers/friendController");
const requestLogger = require("./middlewares/requestLogger");
dotenv.config();
connectDB(); // <-- Kết nối database

const app = express();
app.use(cors());
app.use(requestLogger("User-service")); // 👈 thêm dòng này
app.use(express.json());

// Routes

app.use("/user", require("./routes/userRoutes"));
const internalUsers = require('./routes/internalUsers');
app.use('/friend', require('./routes/friendRouter'));
app.use('/internal/users', internalUsers);
const PORT = process.env.PORT || 5001;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Gắn socket instance vào controller để emit realtime
friendController.setSocketIO(io);

// Lắng nghe kết nối
io.on("connection", (socket) => {
  const { userId } = socket.handshake.query;

  if (!userId) {
    console.warn("⚠️ Socket connected without userId:", socket.id);
    socket.disconnect(true);
    return;
  }

  socket.join(userId);
  console.log(`🔌 [SOCKET] User ${userId} joined room ${userId}`);

  socket.on("disconnect", () => {
    console.log(`❌ [SOCKET] User ${userId} disconnected`);
  });
});

server.listen(PORT, () => console.log(`🚀 User-Service running with realtime on port ${PORT}`));

