const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const http = require("http");
const { Server } = require("socket.io");
const friendController = require("./controllers/friendController");
const requestLogger = require("./middlewares/requestLogger");

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(requestLogger("Friend-service"));
app.use(express.json());

// Routes
app.use("/friend", require("./routes/friendRouter"));

const PORT = process.env.PORT || 5006; 

// Socket setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

friendController.setSocketIO(io);

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

server.listen(PORT, () =>
  console.log(`🚀 Friend-Service running with realtime on port ${PORT}`)
);
