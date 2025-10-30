import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * 🧮 Hàm tính TDEE theo công thức Mifflin–St Jeor
 */
function calculateTDEE(user) {
  const { weight, height, age, gender, activity } = user;
  const s = gender === "nam" ? 5 : -161;
  const BMR = 10 * weight + 6.25 * height - 5 * age + s;

  const activityLevels = {
    "ít": 1.2,
    "nhẹ": 1.375,
    "vừa": 1.55,
    "cao": 1.725,
    "rất cao": 1.9,
  };

  const activityFactor = activityLevels[activity] || 1.2;
  const TDEE = BMR * activityFactor;
  return { BMR: Math.round(BMR), TDEE: Math.round(TDEE), activityFactor };
}

/**
 * 🎯 Hàm chính: Tính toán toàn bộ chỉ số + nhờ AI viết notes
 */
export async function getNutritionAI(userInfo) {
  try {
    // 1️⃣ Tính BMR và TDEE
    const { BMR, TDEE, activityFactor } = calculateTDEE(userInfo);

    // 2️⃣ Phân tích mục tiêu và số kg thay đổi
    const goal = userInfo.goal?.toLowerCase() || "";
    const day = Number(userInfo.day) || 30;
    const weightChange =
      parseFloat(goal.match(/([+-]?\d+(\.\d+)?)\s*kg/)?.[1]) || 0;

    let goalType = "duy trì";
    let dailyCalorieChange = 0;
    let targetCalories = TDEE;

    if (goal.includes("giảm")) {
      goalType = "giảm cân";
      dailyCalorieChange = -(7700 * weightChange) / day;
      targetCalories = TDEE + dailyCalorieChange;
    } else if (goal.includes("tăng")) {
      goalType = "tăng cân";
      dailyCalorieChange = (7700 * weightChange) / day;
      targetCalories = TDEE + dailyCalorieChange;
    }

    // 3️⃣ Giới hạn an toàn
    if (userInfo.gender === "nữ" && targetCalories < 1200)
      targetCalories = 1200;
    if (userInfo.gender === "nam" && targetCalories < 1500)
      targetCalories = 1500;

    targetCalories = Math.round(targetCalories);
    dailyCalorieChange = Math.round(dailyCalorieChange);

    // 4️⃣ Tính macro
    const protein = Math.round(
      userInfo.weight * (goalType === "tăng cân" ? 2 : 1.6)
    );
    const fat = Math.round((targetCalories * 0.25) / 9);
    const carbs = Math.round(
      (targetCalories - (protein * 4 + fat * 9)) / 4
    );

    // 5️⃣ Chuẩn bị prompt cho AI
    const prompt = `
Bạn là chuyên gia dinh dưỡng.
Dưới đây là dữ liệu đã được tính toán theo công thức Mifflin–St Jeor:

- Giới tính: ${userInfo.gender}
- Tuổi: ${userInfo.age}
- Cân nặng: ${userInfo.weight}kg, Chiều cao: ${userInfo.height}cm
- Mức độ vận động: ${userInfo.activity}
- BMR: ${BMR} kcal/ngày
- TDEE: ${TDEE} kcal/ngày
- Hệ số hoạt động: ${activityFactor}
- Mục tiêu: ${goalType} ${weightChange}kg trong ${day} ngày
- Mức thay đổi năng lượng mỗi ngày: ${dailyCalorieChange} kcal/ngày
- Lượng calo cần duy trì: ${targetCalories} kcal/ngày
- Macro: Protein ${protein}g, Fat ${fat}g, Carbs ${carbs}g
- Bệnh lý: ${userInfo.healthConditions?.join(", ") || "Không có"}

Nhiệm vụ:
- Viết **3–4 câu notes ngắn gọn** hướng dẫn ăn uống, ưu tiên thực phẩm tốt cho mục tiêu , và các hạn chế hay ko nên làm hoặc ăn trong quá trình thực đơn.
- Nếu có bệnh lý, thêm lời khuyên phù hợp.
- Không được thay đổi các con số trên.
- Trả về JSON như sau (giữ nguyên định dạng):

{
  "BMR": ${BMR},
  "TDEE": ${TDEE},
  "activityFactor": ${activityFactor},
  "goalType": "${goalType}",
  "weightChangeKg": ${weightChange},
  "durationDays": ${day},
  "dailyCalorieChange": ${dailyCalorieChange},
  "calories": ${targetCalories},
  "protein": ${protein},
  "fat": ${fat},
  "carbs": ${carbs},
  "notes": "..."
}
`;

    // 6️⃣ Gọi AI để viết phần notes
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    // 7️⃣ Parse kết quả JSON
    const text = response.choices[0].message.content;
    const clean = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);

    return result;
  } catch (err) {
    console.error("❌ Lỗi getNutritionAI:", err);
    throw new Error("Không thể tính nhu cầu dinh dưỡng");
  }
}
