import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getNutritionAI } from "./getNutritionAI.js";

dotenv.config();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🥗 Đọc file datafood.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FOOD_DB_PATH = path.join(__dirname, "datafood.json");
const FOOD_DB = JSON.parse(fs.readFileSync(FOOD_DB_PATH, "utf8"));

// 🧂 Các món không lành mạnh nếu dùng làm bữa chính
const UNHEALTHY_FOODS = [
  "trà sữa", "nước ngọt", "coca", "pepsi", "snack", "bim bim",
  "khoai tây chiên", "hamburger", "pizza", "tokbokki", "mì cay",
  "gà rán", "bánh ngọt", "bánh kem", "kẹo", "nước tăng lực"
];

// ✨ Chuẩn hoá văn bản bỏ dấu, bỏ số, bỏ đơn vị
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

// 🔎 Hàm tìm món ăn gần đúng
function findFoodInDB(foodName) {
  const query = normalizeText(foodName);

  function stringSimilarity(a, b) {
    if (!a || !b) return 0;
    a = a.split(" ");
    b = b.split(" ");
    const common = a.filter((w) => b.includes(w)).length;
    const ratio = (2 * common) / (a.length + b.length);
    return ratio;
  }

  let bestMatch = null;
  let bestScore = 0;

  for (const item of FOOD_DB) {
    const dbName = normalizeText(item.name);
    const sim = stringSimilarity(query, dbName);
    const samePrefix = dbName.startsWith(query.split(" ")[0]) ? 0.15 : 0;
    const finalScore = sim + samePrefix;

    if (finalScore > bestScore && finalScore >= 0.4) {
      bestScore = finalScore;
      bestMatch = item;
    }
  }

  if (bestMatch) {
    console.log(
      `🍜 Match [${foodName}] → ${bestMatch.name} (${bestMatch.calories} kcal) | score: ${(bestScore * 100).toFixed(0)}%`
    );
    return bestMatch;
  }

  console.warn(`⚠️ Không tìm thấy món [${foodName}] → dùng mặc định 200 kcal`);
  return {
    name: foodName,
    calories: 200,
    protein: 10,
    fat: 10,
    carbs: 10,
    unit: "1 phần 200g",
  };
}

// 🧠 Phân tích lịch ăn user
export async function analyzeUserScheduleAI(userInfo, userSchedule) {
  try {
    if (!userInfo || !userSchedule?.length)
      throw new Error("Thiếu dữ liệu userInfo hoặc lịch ăn uống");

    if (userSchedule.length > 7) {
      throw new Error("Giới hạn lịch ăn tối đa là 7 ngày.");
    }

    const nutrition = await getNutritionAI(userInfo);

    let totalCalories = 0,
      totalProtein = 0,
      totalFat = 0,
      totalCarbs = 0;
    let unhealthyWarnings = [];
    const scannedFoods = new Set();

    for (const day of userSchedule) {
      if (day.meals?.length > 5) {
        console.warn(`⚠️ Ngày ${day.day} có hơn 5 bữa — bỏ qua các bữa dư.`);
        day.meals = day.meals.slice(0, 5);
      }

      for (const meal of day.meals || []) {
        const mealType = meal.type?.toLowerCase() || "";
        const foodItems = meal.name
          .split(/,|và|\+|&/i)
          .map((f) => f.trim())
          .filter(Boolean);

        for (const item of foodItems) {
          let foodData = meal.nutrition?.[item] || findFoodInDB(item);
          scannedFoods.add(foodData.name);

          totalCalories += foodData.calories;
          totalProtein += foodData.protein;
          totalFat += foodData.fat;
          totalCarbs += foodData.carbs;

          const foundUnhealthy = UNHEALTHY_FOODS.find((u) =>
            item.toLowerCase().includes(u)
          );
          if (foundUnhealthy && ["sáng", "trưa", "tối"].includes(mealType)) {
            unhealthyWarnings.push(
              `⚠️ Món "${foundUnhealthy}" xuất hiện trong bữa ${mealType} — không nên dùng làm bữa chính.`
            );
          }
        }
      }
    }

    const avgCalories = totalCalories / userSchedule.length;
    const avgProtein = totalProtein / userSchedule.length;
    const avgFat = totalFat / userSchedule.length;
    const avgCarbs = totalCarbs / userSchedule.length;

    console.log(
      `📊 Trung bình/ngày: ${avgCalories.toFixed(0)} kcal | P:${avgProtein.toFixed(
        1
      )} | F:${avgFat.toFixed(1)} | C:${avgCarbs.toFixed(1)}`
    );
    console.log(`🍱 Món user đã dùng:`, [...scannedFoods]);
    if (unhealthyWarnings.length > 0) {
      console.log("🚫 Cảnh báo món không lành mạnh:", unhealthyWarnings);
    }

    // 🧠 Prompt hệ thống
    const systemPrompt = `
Bạn là chuyên gia dinh dưỡng tại Việt Nam.
Hãy đánh giá xem chế độ ăn của người dùng có đạt mục tiêu không (tăng/giảm cân).
Người dùng sẽ ăn theo lịch này lặp lại trong suốt thời gian mục tiêu.
Nếu lịch này gần đạt nhưng chưa tối ưu, vẫn coi là "đạt" nhưng nêu rõ lý do.
Tính thêm percentFinish (0-150) — dự đoán % hoàn thành mục tiêu.
Nếu vượt mục tiêu (ăn dư calo hợp lý) → >100%.
Nếu chưa đạt → dưới 100%.

Trả về JSON dạng:
{
  "goalCheck": "đạt" hoặc "không đạt",
  "percentFinish": số (0-150),
  "reason": "...",
  "needToImprove": ["..."],
  "advice": "...",
  "mealSuggestion": ["..."]
}
`;

    // 🧾 Prompt người dùng
    const userPrompt = `
Người dùng: ${userInfo.gender}, ${userInfo.age} tuổi, ${userInfo.weight}kg, ${userInfo.height}cm
Mục tiêu: ${userInfo.goal}, vận động ${userInfo.activity}

Giả định: người dùng ăn lịch này lặp lại suốt ${userInfo.goal.match(/\d+/)?.[0] || 10} ngày.

TDEE: ${nutrition.TDEE.toFixed(0)} kcal
Calories mục tiêu: ${nutrition.calories.toFixed(0)} kcal

Thực tế trung bình/ngày:
Calories: ${avgCalories.toFixed(0)} kcal | Protein: ${avgProtein.toFixed(1)}g | Fat: ${avgFat.toFixed(1)}g | Carbs: ${avgCarbs.toFixed(1)}g

${
  unhealthyWarnings.length
    ? `⚠️ Phát hiện món không phù hợp trong bữa chính:\n${unhealthyWarnings.join(
        "\n"
      )}`
    : ""
}

Đưa ra đánh giá: đạt hay không, % hoàn thành mục tiêu, lời khuyên, và món thay thế.
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
      if (result.goalCheck && !["đạt", "không đạt"].includes(result.goalCheck.trim().toLowerCase())) {
        const normalized = result.goalCheck.toLowerCase();
        result.goalCheck = normalized.includes("không") ? "không đạt" : "đạt";
      }
      if (typeof result.percentFinish !== "number") {
        // Ước tính dựa trên mức chênh lệch calo
        const ratio = (avgCalories / nutrition.calories) * 100;
        result.percentFinish = Math.round(ratio);
      }
    } catch {
      result = {
        goalCheck: "không đạt",
        percentFinish: 0,
        reason: "AI trả về sai định dạng JSON.",
        needToImprove: [],
        advice: text,
        mealSuggestion: [],
      };
    }

    return { step: "advice-only", advice: result };
  } catch (err) {
    console.error("❌ Lỗi analyzeUserScheduleAI:", err.message);
    throw new Error("AI không thể phân tích lịch ăn uống");
  }
}
