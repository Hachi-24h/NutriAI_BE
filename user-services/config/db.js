const mongoose = require("mongoose");
require("dotenv").config({ path: "../.env" });
console.log("🔑 as",process.env.MONGO_URI_01)
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI_01, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
 console.log("✅ MongoDB connected...");
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
