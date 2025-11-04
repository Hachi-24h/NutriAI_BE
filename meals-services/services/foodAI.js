import axios from "axios";
import FormData from "form-data";
import fs from "fs";

const NUTRITIONIX_APP_ID = process.env.NUTRITIONIX_APP_ID;
const NUTRITIONIX_APP_KEY = process.env.NUTRITIONIX_APP_KEY;

export const predictFood = async (imagePath) => {
  try {
    console.time("⏱️ Tổng thời gian predictFood");

    // 1️⃣ Gửi ảnh sang Flask AI
    console.time("📸 Flask /predict");
    const form = new FormData();
    form.append("file", fs.createReadStream(imagePath));
    const flaskRes = await axios.post("http://127.0.0.1:5008/predict", form, {
      headers: form.getHeaders(),
    });
    console.timeEnd("📸 Flask /predict");

    const { food_en, food_vi, confidence } = flaskRes.data;
    console.log(`🍜 AI nhận dạng: ${food_vi} (${food_en}) [${(confidence * 100).toFixed(1)}%]`);

    // 2️⃣ Nutritionix API
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
      nutrition = {
        calories: food.nf_calories,
        protein: food.nf_protein,
        carbs: food.nf_total_carbohydrate,
        fat: food.nf_total_fat,
      };

      const weight = food.serving_weight_grams || 100;
      const caloriesTotal = food.nf_calories * (weight / food.serving_weight_grams);

      if (food) {
        nutrition = {
          calories: food.nf_calories,
          protein: food.nf_protein,
          carbs: food.nf_total_carbohydrate,
          fat: food.nf_total_fat,
        };
      
        // Làm tròn trọng lượng về bội số 50
        let weight = food.serving_weight_grams || 100;
        weight = Math.max(50, Math.round(weight / 50) * 50); // ít nhất 50g
      
        // Tính lại tổng calo theo trọng lượng làm tròn
        const caloriesTotal = food.nf_calories * (weight / food.serving_weight_grams);
        example = {
          serving_desc: food.serving_unit || "serving",
          weight_grams: weight,
          calories_total: Math.round(caloriesTotal),
          note: `≈ ${Math.round(caloriesTotal)} kcal cho ${weight}g (${food.food_name})`,
        };
      }      
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
