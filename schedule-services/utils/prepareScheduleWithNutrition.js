const axios = require("axios");
const fs = require("fs");
const path = require("path");

const FOOD_DB = JSON.parse(
  fs.readFileSync(path.join(__dirname, "./datafood.json"), "utf8")
);
const MEAL_SERVICE_URL =
  process.env.MEAL_SERVICE_URL || "http://localhost:5002";

function normalize(text) {
  return text
    ? text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s]/gi, "")
        .replace(/\s+/g, " ")
        .trim()
    : "";
}

/**
 * Tính độ tương đồng đơn giản giữa 2 chuỗi (đếm từ chung)
 */
function similarity(a, b) {
  const wordsA = normalize(a).split(" ");
  const wordsB = normalize(b).split(" ");
  let matches = 0;
  for (const w of wordsA) {
    if (wordsB.includes(w)) matches++;
  }
  return matches / Math.max(wordsA.length, wordsB.length);
}

/**
 * 🔍 Tra cứu dinh dưỡng theo thứ tự ưu tiên:
 * 1️⃣ Meal-service (ưu tiên cao nhất)
 * 2️⃣ datafood.json (match chặt → fuzzy match)
 * 3️⃣ fallback mặc định
 */
async function getFoodNutrition(userId, foodName) {
  console.log(`🔍 Tra cứu dinh dưỡng cho món: "${foodName}"`);

  // 1️⃣ Meal-service
  try {
    const { data: scannedMeals } = await axios.get(
      `${MEAL_SERVICE_URL}/meals-scand/history`,
      { params: { userId } }
    );

    const q = normalize(foodName);
    const found = scannedMeals.find((m) => {
      const vi = normalize(m.food_vi);
      const en = normalize(m.food_en);
      return q.includes(vi) || vi.includes(q) || q.includes(en);
    });

    if (found && found.nutrition) {
      const { calories, protein, fat, carbs } = found.nutrition;
      console.log(
        `✅ Tìm thấy trong meal-service: ${found.food_vi} → ${calories} cal`
      );
      return [calories || 0, protein || 0, fat || 0, carbs || 0];
    }
  } catch (err) {
    console.warn("⚠️ Không thể truy xuất meal-service:", err.message);
  }

  // 2️⃣ Fallback datafood.json (fuzzy match)
  const q = normalize(foodName);
  let bestMatch = null;
  let bestScore = 0;

  for (const item of FOOD_DB) {
    const score = similarity(q, item.name);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }

  if (bestMatch && bestScore >= 0.3) {
    console.log(
      `📖 Dùng datafood.json: ${bestMatch.name} (similarity ${bestScore.toFixed(
        2
      )}) → ${bestMatch.calories} cal, P${bestMatch.protein}, F${bestMatch.fat}, C${bestMatch.carbs}`
    );
    return [
      bestMatch.calories || 0,
      bestMatch.protein || 0,
      bestMatch.fat || 0,
      bestMatch.carbs || 0,
    ];
  }

  // 3️⃣ fallback mặc định
  console.log(`❌ Không tìm thấy dinh dưỡng cho "${foodName}"`);
  return [200, 10, 10, 20];
}

/**
 * 🧮 Tính tổng CPFCa cho 1 bữa (nhiều món)
 */
async function calculateMealCPFCa(userId, mealName) {
  console.log(`\n🍽️ Bắt đầu tính CPFCa cho bữa: "${mealName}"`);
  const foods = mealName
    .split(/,|và|\+|&/i)
    .map((f) => f.trim())
    .filter(Boolean);

  let totalCals = 0,
    totalProtein = 0,
    totalFat = 0,
    totalCarbs = 0;

  for (const food of foods) {
    const [cal, pro, fat, carb] = await getFoodNutrition(userId, food);
    totalCals += cal;
    totalProtein += pro;
    totalFat += fat;
    totalCarbs += carb;
  }

  console.log(
    `📊 Tổng bữa "${mealName}": ${totalCals} cal | P${totalProtein} F${totalFat} C${totalCarbs}`
  );

  return [
    Math.round(totalCals),
    Math.round(totalProtein),
    Math.round(totalFat),
    Math.round(totalCarbs),
  ];
}

/**
 * ✨ Chuẩn hóa lịch: thêm description + CPFCa
 */
async function prepareScheduleWithNutrition(rawData) {
  const { userId, schedule } = rawData;
  if (!userId || !schedule?.length)
    throw new Error("Thiếu userId hoặc schedule");

  console.log("\n================ 🔧 BẮT ĐẦU XỬ LÝ LỊCH ================");
  const newSchedule = [];

  for (const day of schedule) {
    console.log(`\n📅 Ngày: ${day.dateID || day.day}`);
    const meals = [];

    for (const meal of day.meals) {
      const CPFCa = await calculateMealCPFCa(userId, meal.name);
      meals.push({
        mealName: meal.name,
        mealType: meal.type,
        mealTime: meal.time,
        description: "Món ăn do người dùng đề xuất",
        CPFCa,
      });
    }

    newSchedule.push({
      dateID: day.dateID || `Day ${day.day || newSchedule.length + 1}`,
      meals,
    });
  }

  console.log("\n✅ Hoàn tất xử lý lịch\n==================================================");
  return { ...rawData, schedule: newSchedule };
}

module.exports = { prepareScheduleWithNutrition };
