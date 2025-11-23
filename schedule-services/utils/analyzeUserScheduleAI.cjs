const OpenAI = require("openai").default;
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const NodeCache = require("node-cache");
const crypto = require("crypto");
const { getNutritionAI } = require("./getNutritionAI.js");

dotenv.config();



const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Cache: meal cache & GPT cache
const mealCache = new NodeCache({ stdTTL: 300 }); // cache meal 5 phút
const aiAdviceCache = new NodeCache({ stdTTL: 3600 }); // cache GPT 1h

// 🥗 Đọc file datafood.json

const FOOD_DB_PATH = path.join(__dirname, "datafood.json");
const FOOD_DB = JSON.parse(fs.readFileSync(FOOD_DB_PATH, "utf8"));

// URL Meal Service
const MEAL_SERVICE_URL = process.env.MEAL_SERVICE_URL || "http://localhost:5002";

// Món không lành mạnh
const UNHEALTHY_FOODS = [
  "trà sữa", "nước ngọt", "coca", "pepsi", "snack", "bim bim",
  "khoai tây chiên", "hamburger", "pizza", "tokbokki", "mì cay",
  "gà rán", "bánh ngọt", "bánh kem", "kẹo", "nước tăng lực"
];

// Chuẩn hoá text (bỏ dấu, bỏ đơn vị)
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\d+/g, "")
    .replace(/\b(tô|ly|chén|phần|cái|trái|hũ|hộp|ổ|miếng|khoanh|quả|củ|lá|bịch|dĩa|bát)\b/g, "")
    .replace(/[^a-zA-Z\s]/g, "")
    .trim();
}

// Tìm món tương tự trong datafood.json
function findFoodInDB(foodName) {
  const query = normalizeText(foodName);
  function stringSimilarity(a, b) {
    if (!a || !b) return 0;
    const aw = a.split(" ");
    const bw = b.split(" ");
    const common = aw.filter((w) => bw.includes(w)).length;
    return (2 * common) / (aw.length + bw.length);
  }

  let best = null, bestScore = 0;
  for (const item of FOOD_DB) {
    const dbName = normalizeText(item.name);
    const sim = stringSimilarity(query, dbName);
    const samePrefix = dbName.startsWith(query.split(" ")[0]) ? 0.15 : 0;
    const score = sim + samePrefix;

    if (score > bestScore && score >= 0.4) {
      bestScore = score;
      best = item;
    }
  }

  return best || {
    name: foodName,
    calories: 200,
    protein: 10,
    fat: 10,
    carbs: 10,
    unit: "1 phần 200g",
  };
}

// Tóm tắt danh sách món phổ biến
function summarizeFoods(scannedFoods, top = 10) {
  const list = Array.from(scannedFoods);
  return list.length <= top ? list : list.slice(0, top);
}

// 🧠 Hàm chính
async function analyzeUserScheduleAI(userInfo, userSchedule) {
  try {
    if (!userInfo || !userInfo.userId || !userSchedule?.length)
      throw new Error("Thiếu userInfo, userId hoặc lịch ăn");

    if (userSchedule.length > 7)
      throw new Error("Giới hạn lịch ăn tối đa là 7 ngày.");

    // 🔹 Cache key GPT
    const cacheKey = crypto
      .createHash("md5")
      .update(JSON.stringify({ userInfo, userSchedule }))
      .digest("hex");

    if (aiAdviceCache.has(cacheKey)) {
      console.log("⚡ Lấy lại kết quả từ cache GPT");
      return aiAdviceCache.get(cacheKey);
    }

    // 🔹 Lấy toàn bộ món đã scan của user 1 lần duy nhất
    let scannedMeals = [];
    try {
      const res = await axios.get(`${MEAL_SERVICE_URL}/meals-scand/history`, {
        params: { userId: userInfo.userId },
      });
      if (Array.isArray(res.data)) {
        scannedMeals = res.data;
        console.log(`📦 Lấy ${scannedMeals.length} món từ meal-service`);
      } else {
        console.warn("⚠️ Meal-service trả sai format:", res.data);
      }
    } catch (err) {
      console.warn("⚠️ Lỗi khi gọi Meal Service:", err.message);
    }
    console.log("🧩 Gọi meal-service với userId:", userInfo.userId);
    const nutritionGoal = await getNutritionAI(userInfo);

    let totalCalories = 0, totalProtein = 0, totalFat = 0, totalCarbs = 0;
    const unhealthyWarnings = [];
    const scannedFoods = new Set();
    let foundCount = 0, fallbackCount = 0;
    const foodCache = {}; // ⚡ cache session cho món ăn trùng

    // 🔁 Xử lý từng ngày, từng bữa ăn
    for (const day of userSchedule) {
      for (const meal of day.meals || []) {
        const mealType = meal.type?.toLowerCase() || "";
        const foodItems = meal.name.split(/,|và|\+|&/i).map((f) => f.trim()).filter(Boolean);

        for (const item of foodItems) {
          const normalizedQuery = normalizeText(item);

          // ⚡ Dùng cache session nếu món đã được tính trước đó
          if (foodCache[normalizedQuery]) {
            const foodData = foodCache[normalizedQuery];
            console.log(`⚡ Dùng cache session cho "${item}"`);
            scannedFoods.add(item);
            totalCalories += foodData.calories;
            totalProtein += foodData.protein;
            totalFat += foodData.fat;
            totalCarbs += foodData.carbs;
            continue;
          }

          // Tìm trong meal-service
          const foundMeal = scannedMeals.find((m) => {
            const normalizedFood = normalizeText(m.food_vi || "");
            return (
              normalizedFood.includes(normalizedQuery) ||
              normalizedQuery.includes(normalizedFood)
            );
          });

          let foodData;
          if (foundMeal) {
            foundCount++;
            foodData = foundMeal.nutrition;
            console.log(`✅ Tìm thấy món trong meal-service: "${item}" → ${foundMeal.food_vi}`);
          } else {
            fallbackCount++;
            foodData = findFoodInDB(item);
            console.log(`📖 Dùng dữ liệu từ datafood.json cho "${item}"`);
          }

          // Lưu cache session
          foodCache[normalizedQuery] = foodData;

          scannedFoods.add(item);
          totalCalories += foodData.calories;
          totalProtein += foodData.protein;
          totalFat += foodData.fat;
          totalCarbs += foodData.carbs;

          // Cảnh báo món không lành mạnh
          const foundUnhealthy = UNHEALTHY_FOODS.find((u) =>
            item.toLowerCase().includes(u)
          );
          if (foundUnhealthy && ["sáng", "trưa", "tối"].includes(mealType)) {
            unhealthyWarnings.push(
              `⚠️ Món "${foundUnhealthy}" trong bữa ${mealType} — không nên dùng làm bữa chính.`
            );
          }
        }
      }
    }

    const avgCalories = totalCalories / userSchedule.length;
    const avgProtein = totalProtein / userSchedule.length;
    const avgFat = totalFat / userSchedule.length;
    const avgCarbs = totalCarbs / userSchedule.length;
    const topFoods = summarizeFoods(scannedFoods, 12);

    console.log(`📊 Tổng món: ${foundCount + fallbackCount} | từ meal-service: ${foundCount} | fallback JSON: ${fallbackCount}`);
    console.log("📈 TRUNG BÌNH / NGÀY:", { avgCalories, avgProtein, avgFat, avgCarbs });
    console.log("🍽️ Món phổ biến:", topFoods);

    // 🧠 GPT prompt
    const systemPrompt = `
Bạn là chuyên gia dinh dưỡng Việt Nam. 
Đánh giá xem chế độ ăn có đạt mục tiêu không (tăng/giảm cân).
Trả về JSON:
{
  "goalCheck": "đạt" | "không đạt",
  "percentFinish": number,
  "reason": "...",
  "advice": "...",
  "mealSuggestion": ["..."]
}
`;

    const userPrompt = `
Người dùng: ${userInfo.gender}, ${userInfo.age} tuổi, ${userInfo.weight}kg, ${userInfo.height}cm
Mục tiêu: ${userInfo.goal}, vận động ${userInfo.activity}
TDEE: ${nutritionGoal.TDEE.toFixed(0)} kcal | Calories mục tiêu: ${nutritionGoal.calories.toFixed(0)} kcal

Trung bình/ngày:
Calories: ${avgCalories.toFixed(0)} kcal | Protein: ${avgProtein.toFixed(1)}g | Fat: ${avgFat.toFixed(1)}g | Carbs: ${avgCarbs.toFixed(1)}g
Các món phổ biến: ${topFoods.join(", ")}
${unhealthyWarnings.length ? "⚠️ " + unhealthyWarnings.join("; ") : ""}
`;

    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    });

    const text = response.choices[0].message.content.trim();
    const clean = text.replace(/```json|```/g, "").trim();

    let result;
    try {
      result = JSON.parse(clean);
      if (typeof result.percentFinish !== "number")
        result.percentFinish = Math.round((avgCalories / nutritionGoal.calories) * 100);
      if (!["đạt", "không đạt"].includes(result.goalCheck?.toLowerCase()))
        result.goalCheck = result.goalCheck?.includes("không") ? "không đạt" : "đạt";
      if (result.needToImprove) delete result.needToImprove;
    } catch {
      result = {
        goalCheck: "không đạt",
        percentFinish: Math.round((avgCalories / nutritionGoal.calories) * 100),
        reason: "AI trả sai JSON",
        advice: text,
        mealSuggestion: [],
      };
    }

    const finalResult = { step: "advice-only", advice: result };
    aiAdviceCache.set(cacheKey, finalResult); // lưu cache GPT
    return finalResult;
  } catch (err) {
    console.error("❌ Lỗi analyzeUserScheduleAI:", err.message);
    throw new Error("AI không thể phân tích lịch ăn uống");
  }
}
module.exports = { analyzeUserScheduleAI };