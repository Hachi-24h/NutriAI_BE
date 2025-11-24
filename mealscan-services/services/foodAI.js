const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const RAW_SCANAI_URL =
  process.env.SCANAI_URL || "http://gateway:5000/scanai/predict";

const SCANAI_URL = RAW_SCANAI_URL.endsWith("/predict")
  ? RAW_SCANAI_URL
  : RAW_SCANAI_URL + "/predict";

console.log("🔥 ScanAI API URL =", SCANAI_URL);

const predictFood = async (imagePathOrUrl) => {
  try {
    console.time("⏱️ predictFood TOTAL");

    let flaskRes;

    if (imagePathOrUrl.startsWith("http")) {
      console.time("🌐 scanAI /predict (URL)");

      flaskRes = await axios.post(
        SCANAI_URL,
        { image_url: imagePathOrUrl },
        { headers: { "Content-Type": "application/json" } }
      );

      console.timeEnd("🌐 scanAI /predict (URL)");
    } else {
      console.time("📁 scanAI /predict (file)");

      const form = new FormData();
      form.append("file", fs.createReadStream(imagePathOrUrl));

      flaskRes = await axios.post(SCANAI_URL, form, {
        headers: form.getHeaders(),
      });

      console.timeEnd("📁 scanAI /predict (file)");
    }

    const { food_en, food_vi, confidence } = flaskRes.data;

    console.log(
      `🍜 AI Scan: ${food_vi} (${food_en}) [${(confidence * 100).toFixed(1)}%]`
    );

    // ===================================================
    //       API NINJAS → Lấy dinh dưỡng (FREE)
    // ===================================================
    console.time("🥗 API-Ninjas");

    const ninjasRes = await axios.get(
      "https://api.api-ninjas.com/v1/nutrition",
      {
        params: { query: food_en },
        headers: { "X-Api-Key": process.env.NINJAS_KEY },
      }
    );

    console.timeEnd("🥗 API-Ninjas");

    const food = ninjasRes.data?.[0];
    let nutrition = null;
    let example = null;

    if (food) {
      const weight = Math.max(
        50,
        Math.round((food.serving_size_g || 100) / 50) * 50
      );

      const caloriesTotal =
        food.calories * (weight / (food.serving_size_g || 100));

      nutrition = {
        calories: food.calories,
        protein: food.protein_g,
        carbs: food.carbohydrates_total_g,
        fat: food.fat_total_g,
      };

      example = {
        serving_desc: food.serving_size || "serving",
        weight_grams: weight,
        calories_total: Math.round(caloriesTotal),
        note: `≈ ${Math.round(caloriesTotal)} kcal cho ${weight}g (${food.name})`,
      };
    }

    console.timeEnd("⏱️ predictFood TOTAL");

    return {
      name_en: food_en,
      name_vi: food_vi,
      confidence,
      nutrition,
      example,
    };
  } catch (err) {
    console.error("❌ predictFood ERROR:", err.message);
    if (err.response?.data) console.error("SERVER:", err.response.data);
    return null;
  }
};

module.exports = { predictFood };
