const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const NUTRITIONIX_APP_ID = process.env.NUTRITIONIX_APP_ID;
const NUTRITIONIX_APP_KEY = process.env.NUTRITIONIX_APP_KEY;

 const predictFood = async (imagePath) => {
  try {
    console.time("⏱️ Tổng thời gian predictFood");

    let flaskRes;

    // ✅ Nếu là URL Cloudinary → gửi JSON
    if (imagePath.startsWith("http")) {
      console.time("🌐 Flask /predict (URL)");
      flaskRes = await axios.post(
        "http://127.0.0.1:5008/predict", // ⚙️ port trùng Flask bạn đang chạy
        { image_url: imagePath },
        { headers: { "Content-Type": "application/json" } }
      );
      console.timeEnd("🌐 Flask /predict (URL)");
    } 
    // ✅ Nếu là file local (ít khi dùng)
    else {
      console.time("📁 Flask /predict (file)");
      const form = new FormData();
      form.append("file", fs.createReadStream(imagePath));
      flaskRes = await axios.post("http://127.0.0.1:5008/predict", form, {
        headers: form.getHeaders(),
      });
      console.timeEnd("📁 Flask /predict (file)");
    }

    const { food_en, food_vi, confidence } = flaskRes.data;
    console.log(`🍜 AI nhận dạng: ${food_vi} (${food_en}) [${(confidence * 100).toFixed(1)}%]`);

    // 🥗 Nutritionix API
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
      const weight = Math.max(50, Math.round((food.serving_weight_grams || 100) / 50) * 50);
      const caloriesTotal = food.nf_calories * (weight / food.serving_weight_grams);

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

    console.timeEnd("⏱️ Tổng thời gian predictFood");

    return {
      name_vi: food_vi,
      name_en: food_en,
      confidence,
      nutrition,
      example,
    };

  } catch (err) {
    console.error("❌ Prediction or nutrition error:", err.message);
    return null;
  }
};
module.exports = { predictFood };