const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// ✅ Load file .env từ thư mục gốc NutriAI_BE
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
console.log("🔑 as",process.env.MONGO_URI_01)
const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI_01;

    if (!uri) {
      throw new Error("❌ Missing MONGO_URI_01 in .env file!");
    }

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ MongoDB connected (Schedule Service)");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
