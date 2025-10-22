import mongoose from "mongoose";

const MealTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  days: [{ type: String, required: true }], // list ID của MealDay
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now } // dùng function reference
});

export default mongoose.model("MealTemplate", MealTemplateSchema);
