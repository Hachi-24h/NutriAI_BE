// services/nutritionixService.js
const axios = require("axios");

const NUTRITIONIX_APP_ID = process.env.NUTRITIONIX_APP_ID;
const NUTRITIONIX_APP_KEY = process.env.NUTRITIONIX_APP_KEY;

const headers = {
  "x-app-id": NUTRITIONIX_APP_ID,
  "x-app-key": NUTRITIONIX_APP_KEY,
  "Content-Type": "application/json",
};

// 🔍 Tìm món ăn (instant search)
async function searchFoods(query) {
  const url = `https://trackapi.nutritionix.com/v2/search/instant?query=${encodeURIComponent(query)}`;
  const { data } = await axios.get(url, { headers });
  return data;
}

// 🍽️ Lấy thông tin dinh dưỡng chi tiết
async function getFoodNutrition(query) {
  const url = "https://trackapi.nutritionix.com/v2/natural/nutrients";
  const { data } = await axios.post(url, { query }, { headers });
  return data.foods;
}

module.exports = { searchFoods, getFoodNutrition };
