import OpenAI from "openai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// 👇 FIX: ép dotenv load file .env từ đúng thư mục chatbot-services
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Kiểm tra xem key có load chưa
console.log("🔑 OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "✅ Loaded" : "❌ Missing");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function askOpenAI(prompt) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are NutriAI, a helpful nutrition assistant." },
      { role: "user", content: prompt },
    ],
  });

  return completion.choices[0].message.content;
}
