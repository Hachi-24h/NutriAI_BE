const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

// URL từ ENV hoặc fallback Gateway
const RAW_SCANAI_URL =
  process.env.SCANAI_URL || "http://gateway:5000/scanai/predict";

// 🔥 Auto append /predict nếu thiếu
const SCANAI_URL = RAW_SCANAI_URL.endsWith("/predict")
  ? RAW_SCANAI_URL
  : RAW_SCANAI_URL + "/predict";

console.log("🔥 ScanAI API URL =", SCANAI_URL);

const NUTRITIONIX_APP_ID = process.env.NUTRITIONIX_APP_ID;
const NUTRITIONIX_APP_KEY = process.env.NUTRITIONIX_APP_KEY;

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
    //        Nutritionix API → lấy dinh dưỡng
    // ===================================================
    console.time("🥗 Nutritionix");

    const nutriRes = await axios.post(
      "https://trackapi.nutritionix.com/v2/natural/nutrients",
      { query: food_en },
      {
        headers: {
          "x-app-id": NUTRITIONIX_APP_ID,
          "x-app-key": NUTRITIONIX_APP_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.timeEnd("🥗 Nutritionix");

    const food = nutriRes.data?.foods?.[0];
    let nutrition = null;
    let example = null;

    if (food) {
      const weight =
        Math.max(50, Math.round((food.serving_weight_grams || 100) / 50) * 50);

      const caloriesTotal =
        food.nf_calories * (weight / food.serving_weight_grams);

      nutrition = {
        calories: food.nf_calories,
        protein: food.nf_protein,
        carbs: food.nf_total_carbohydrate,
        fat: food.nf_total_fat,
      };

      example = {
        serving_desc: food.serving_unit || "serving",
        weight_grams: weight,
        calories_total: Math.round(caloriesTotal),
        note: `≈ ${Math.round(caloriesTotal)} kcal cho ${weight}g (${food.food_name})`,
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
