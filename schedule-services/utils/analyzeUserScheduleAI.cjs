const OpenAI = require("openai").default;
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const NodeCache = require("node-cache");
const crypto = require("crypto");
const { getNutritionAI } = require("./getNutritionAI.js");

dotenv.config({ path: "../.env" });

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const aiAdviceCache = new NodeCache({ stdTTL: 3600 });

/* ================= FOOD DB ================= */
const FOOD_DB_PATH = path.join(__dirname, "datafood.json");
const FOOD_DB = JSON.parse(fs.readFileSync(FOOD_DB_PATH, "utf8"));

const MEAL_SERVICE_URL =
  process.env.MEAL_SERVICE_URL || "http://localhost:5002";

/* ================= HELPERS ================= */
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\d+/g, "")
    .replace(/\b(tô|ly|chén|phần|cái|trái|hũ|hộp|ổ|miếng|quả|bát|đĩa)\b/g, "")
    .replace(/[^a-z\s]/g, "")
    .trim();
}

function findFoodInDB(foodName) {
  const query = normalizeText(foodName);

  function similarity(a, b) {
    const aw = a.split(" ");
    const bw = b.split(" ");
    const common = aw.filter(w => bw.includes(w)).length;
    return (2 * common) / (aw.length + bw.length);
  }

  let best = null;
  let bestScore = 0;

  for (const item of FOOD_DB) {
    const score = similarity(query, normalizeText(item.name));
    if (score > bestScore && score >= 0.4) {
      bestScore = score;
      best = item;
    }
  }

  return (
    best || {
      name: foodName,
      calories: 200,
    }
  );
}

/* ================= SUGGEST FOOD LOGIC ================= */
function suggestFoodsForDay(missingCalories, eatenFoods = []) {
  const suggestions = [];

  const hasProtein = eatenFoods.some(f =>
    /(thịt|cá|trứng|đậu|ức gà|bò|heo)/i.test(f)
  );
  const hasCarbs = eatenFoods.some(f =>
    /(cơm|bún|mì|khoai|bánh mì|miến)/i.test(f)
  );

  if (missingCalories >= 800) {
    suggestions.push(
      "Thêm 1 bữa phụ gồm sinh tố chuối + sữa hoặc bánh mì + trứng"
    );
  }

  if (missingCalories >= 400 && !hasCarbs) {
    suggestions.push(
      "Tăng thêm 1 chén cơm hoặc 1 củ khoai lang trong bữa chính"
    );
  }

  if (!hasProtein) {
    suggestions.push(
      "Bổ sung protein như trứng luộc, cá, ức gà hoặc đậu hũ"
    );
  }

  if (missingCalories < 400) {
    suggestions.push(
      "Thêm sữa chua, trái cây hoặc 1 ly sữa để bù calories"
    );
  }

  return suggestions.slice(0, 3);
}

/* ================= MAIN ================= */
async function analyzeUserScheduleAI(userInfo, userSchedule) {
  try {
    if (!userInfo?.userId || !Array.isArray(userSchedule))
      throw new Error("Thiếu userInfo hoặc lịch ăn");

    const cacheKey = crypto
      .createHash("md5")
      .update(JSON.stringify({ userInfo, userSchedule }))
      .digest("hex");

    if (aiAdviceCache.has(cacheKey)) {
      return aiAdviceCache.get(cacheKey);
    }

    /* ===== GET MEAL HISTORY ===== */
    let scannedMeals = [];
    try {
      const res = await axios.get(
        `${MEAL_SERVICE_URL}/meals-scand/history`,
        { params: { userId: userInfo.userId } }
      );
      if (Array.isArray(res.data)) scannedMeals = res.data;
    } catch {}

    /* ===== GOAL ===== */
    const nutritionGoal = await getNutritionAI(userInfo);
    const targetCalories = nutritionGoal.calories;

    /* ===== ANALYZE PER DAY ===== */
    const dailyStats = [];

    for (const day of userSchedule) {
      let dayCalories = 0;
      const foodsInDay = [];

      for (const meal of day.meals || []) {
        const items = meal.name
          .split(/,|và|\+|&/i)
          .map(i => i.trim())
          .filter(Boolean);

        for (const item of items) {
          const normalized = normalizeText(item);

          const food =
            scannedMeals.find(m =>
              normalizeText(m.food_vi || "").includes(normalized)
            )?.nutrition || findFoodInDB(item);

          dayCalories += food.calories;
          foodsInDay.push(item);
        }
      }

      dailyStats.push({
        date: day.date || `Ngày ${dailyStats.length + 1}`,
        calories: dayCalories,
        foods: foodsInDay,
      });
    }

    /* ===== EVALUATE DAYS ===== */
    const evaluatedDays = dailyStats.map(d => {
      const diff = d.calories - targetCalories;
      let status = "đạt";

      if (diff > 200) status = "ăn dư quá nhiều";
      else if (diff < -200) status = "ăn thiếu quá nhiều";

      return { ...d, diff, status };
    });

    const okDays = evaluatedDays.filter(d => d.status === "đạt").length;
    const percentFinish = Math.round(
      (okDays / evaluatedDays.length) * 100
    );
    const goalCheck = percentFinish >= 70 ? "đạt" : "không đạt";

    /* ===== DAILY FOOD SUGGESTIONS ===== */
    const dailyFoodSuggestions = evaluatedDays
      .filter(d => d.status !== "đạt")
      .map(d => {
        const missingCalories = Math.abs(d.diff);
        return {
          date: d.date,
          missingCalories,
          eatenFoods: d.foods,
          suggestions: suggestFoodsForDay(
            missingCalories,
            d.foods
          ),
        };
      });

    /* ===== REASON ===== */
    let reason = "";
    if (!dailyFoodSuggestions.length) {
      reason =
        "Tất cả các ngày đều có lượng calories phù hợp với mục tiêu.";
    } else {
      reason =
        "Một số ngày chưa đạt calories mục tiêu. Chi tiết từng ngày:\n\n" +
        dailyFoodSuggestions
          .map(
            d =>
              `- ${d.date}: thiếu ${d.missingCalories} kcal\n` +
              `  → Nên thêm: ${d.suggestions.join("; ")}`
          )
          .join("\n\n");
    }

    /* ===== GPT (SHORT ADVICE ONLY) ===== */
    const systemPrompt = `
Bạn là chuyên gia dinh dưỡng.
Viết lời khuyên NGẮN (3–4 câu), tổng quát.
Không liệt kê món ăn.
`;

    const userPrompt = `
Calories mục tiêu: ${targetCalories} kcal/ngày
Số ngày chưa đạt: ${dailyFoodSuggestions.length}
`;

    const gptRes = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    });

    const adviceText =
      gptRes.choices[0].message.content.trim();

    /* ===== FINAL RESULT ===== */
    const result = {
      step: "daily-analysis",
      advice: {
        goalCheck,
        percentFinish,
        reason,
        advice: adviceText,
        dailyFoodSuggestions,
      },
    };

    aiAdviceCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error("❌ analyzeUserScheduleAI:", err.message);
    throw new Error("Không thể phân tích lịch ăn uống");
  }
}

module.exports = { analyzeUserScheduleAI };
