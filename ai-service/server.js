// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { cuarnos } from "./utils/cuarnos.js";

import { generatePlan } from "./utils/generatePlan.js";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/generate-meal", async (req, res) => {
  try {
    const { info, totalDays = 30 } = req.body; // totalDays user chọn
    if (!info) {
      return res.status(400).json({ error: "Thiếu tham số info" });
    }

    const weekPlan = await cuarnos(info); // trả về { schedule: [...] }
    const fullPlan = generatePlan([weekPlan], totalDays, new Date());

    res.json({ schedule: fullPlan });
  } catch (err) {
    res.status(500).json({
      error: "Không tạo được lịch ăn uống",
      detail: err.message,
    });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ AI service running on http://localhost:${PORT}`);
});
