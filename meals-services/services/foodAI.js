// services/foodAI.js
const fs = require("fs");
const OpenAI = require("openai");
const axios = require("axios");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function detectFood(imagePath, fallbackQuery = "rice") {
  let foodName;

  try {
    // 1. Thử dùng OpenAI Vision
    const result = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a food recognition AI. Only return the main food name in English."
        },
        {
          role: "user",
          content: "Identify the food in this image."
        }
      ],
      modalities: ["text", "image"],
      images: [fs.readFileSync(imagePath).toString("base64")]
    });

    foodName = result.choices[0].message.content.trim();
    console.log("✅ OpenAI detected:", foodName);
  } catch (err) {
    console.error("⚠️ OpenAI failed:", err.message);
    // Nếu OpenAI hết quota → fallback
    foodName = fallbackQuery;
  }

  // 2. Luôn gọi Nutritionix để lấy calories
  const nutrition = await axios.post(
    "https://trackapi.nutritionix.com/v2/natural/nutrients",
    { query: foodName },
    {
      headers: {
        "x-app-id": process.env.NUTRITIONIX_APP_ID,
        "x-app-key": process.env.NUTRITIONIX_APP_KEY,
        "Content-Type": "application/json"
      }
    }
  );

  const item = nutrition.data.foods[0];

  return {
    foodName,
    calories: item.nf_calories,
    nutrients: {
      protein: item.nf_protein,
      carbs: item.nf_total_carbohydrate,
      fat: item.nf_total_fat
    }
  };
}

module.exports = { detectFood };
