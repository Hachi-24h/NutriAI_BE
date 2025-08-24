const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema({
  user: { type:String , required: true }, 
  ratting: { type: Number, required: true },
  reviewText: { type: String, required: true },
  reviewDate: { type: Date, default: Date.now },
  sugest: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("Review", ReviewSchema);
