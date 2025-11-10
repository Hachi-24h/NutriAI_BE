const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ CHẠY CONNECT DB TRƯỚC
connectDB().then(() => {
  console.log("✅ Database ready, starting routes...");

  // Import routes sau khi DB đã kết nối xong
  app.use("/admin", require("./routes/adminRoutes"));

  const PORT = process.env.PORT || 5004;
  app.listen(PORT, () => console.log(`🚀 Admin Service running on port ${PORT}`));
});
