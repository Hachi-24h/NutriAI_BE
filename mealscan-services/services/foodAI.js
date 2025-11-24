const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const OpenAI = require("openai");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const RAW_SCANAI_URL = process.env.SCANAI_URL;
const SCANAI_URL = RAW_SCANAI_URL.endsWith("/predict")
  ? RAW_SCANAI_URL
  : RAW_SCANAI_URL + "/predict";

const NINJAS_KEY = process.env.NINJAS_KEY;


// ============================
// GPT Fallback Nutrition
// ============================
async function gptNutrition(food_en) {
  const prompt = `
Give approximate nutrition values for 100g of "${food_en}".
Return ONLY JSON:
{
  "calories": <number>,
  "protein": <number>,
  "carbs": <number>,
  "fat": <number>
}`;

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: food_en }
    ]
  });

  try {
    return JSON.parse(res.choices[0].message.content);
  } catch {
    return null;
  }
}


// ============================
// Nutrition from Ninjas
// ============================
async function ninjasNutrition(food_en) {
  try {
    const res = await axios.get(
      "https://api.api-ninjas.com/v1/nutrition",
      {
        params: { query: food_en },
        headers: { "X-Api-Key": NINJAS_KEY }
      }
    );

    const f = res.data?.[0];

    if (!f || typeof f.calories === "string") return null;

    return {
      calories: f.calories,
      protein: f.protein_g,
      carbs: f.carbohydrates_total_g,
      fat: f.fat_total_g
    };
  } catch {
    return null;
  }
}


// ============================
// Main function
// ============================
const predictFood = async (imagePathOrUrl) => {
  try {
    let flaskRes;

    // call scanAI
    if (imagePathOrUrl.startsWith("http")) {
      flaskRes = await axios.post(SCANAI_URL,
        { image_url: imagePathOrUrl },
        { headers: { "Content-Type": "application/json" } }
      );
    } else {
      const form = new FormData();
      form.append("file", fs.createReadStream(imagePathOrUrl));
      flaskRes = await axios.post(SCANAI_URL, form, { headers: form.getHeaders() });
    }

    const { food_en, food_vi, confidence } = flaskRes.data;

    // 1) Try Ninjas
    let nutrition = await ninjasNutrition(food_en);

    // 2) If Ninjas fails → use GPT
    if (!nutrition) {
      nutrition = await gptNutrition(food_en);
    }

    // Always generate example info
    const example = {
      serving_desc: "100g",
      weight_grams: 100,
      calories_total: nutrition.calories,
      note: `≈ ${nutrition.calories} kcal cho 100g (${food_en})`
    };

    return {
      name_en: food_en,
      name_vi: food_vi,
      confidence,
      nutrition,
      example,
      image_url: imagePathOrUrl
    };

  } catch (err) {
    console.log("❌ predictFood ERROR:", err.message);
    return null;
  }
};


module.exports = { predictFood };
