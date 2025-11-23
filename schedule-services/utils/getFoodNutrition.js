const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

const API_URL = "https://trackapi.nutritionix.com/v2/natural/nutrients";

 async function getFoodNutrition(foodName) {
  try {
    const res = await axios.post(
      API_URL,
      { query: foodName },
      {
        headers: {
          "x-app-id": process.env.NUTRITIONIX_APP_ID,
          "x-app-key": process.env.NUTRITIONIX_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const item = res.data.foods?.[0];
    if (!item) throw new Error("Không có dữ liệu Nutritionix cho món này");

    return {
      calories: item.nf_calories || 0,
      protein: item.nf_protein || 0,
      fat: item.nf_total_fat || 0,
      carbs: item.nf_total_carbohydrate || 0,
    };
  } catch (err) {
    console.error(`⚠️ Nutritionix error for [${foodName}]:`, err.response?.status || err.message);
    // fallback mặc định cho các món Việt nếu API fail
    return {
      calories: 400 + Math.random() * 300,
      protein: 20 + Math.random() * 10,
      fat: 10 + Math.random() * 10,
      carbs: 40 + Math.random() * 20,
    };
  }
}

module.exports = { getFoodNutrition };