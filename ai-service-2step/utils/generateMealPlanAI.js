import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Sinh meal plan dựa trên nutritionNeeds + user info (rút gọn schema)
 * @param {Object} userInfo - Thông tin người dùng
 * @param {Object} nutritionNeeds - Chỉ số dinh dưỡng từ bước 1 (có notes)
 * @returns {Object} mealPlan
 */
export async function generateMealPlanAI(userInfo, nutritionNeeds) {
  const prompt = `
Bạn là chuyên gia dinh dưỡng. 
Hãy tạo lịch ăn uống ${userInfo.mealsPerDay || 3} bữa/ngày cho ${userInfo.dateTemplate } ngày, phù hợp với thông tin sau:

📌 Thông tin người dùng:
${JSON.stringify(userInfo)}

📌 Nhu cầu dinh dưỡng hằng ngày (từ bước 1):
${JSON.stringify({
    calories: nutritionNeeds.calories,
    protein: nutritionNeeds.protein,
    fat: nutritionNeeds.fat,
    carbs: nutritionNeeds.carbs
  })}

📌 Ghi chú dinh dưỡng cần tuân theo:
"${nutritionNeeds.notes}"

⚠️ Yêu cầu:
- Thực đơn phải thực tế, nguyên liệu dễ mua tại Việt Nam.
-Bữa sáng chiếm khoảng 25%, trưa 40%, tối 35%.
- Tuân thủ các hạn chế trong user info (ví dụ: loại bỏ hành nếu user cấm).
- Chỉ cần trả về theo ngày → danh sách các bữa ăn theo thứ tự (sáng, trưa, tối).
- Mỗi món chỉ gồm: nameMeals, description, totalCalor.
- Không cần trường typeTime, time, notes.
- Chỉ xuất JSON, không kèm giải thích.

Trả về JSON theo schema:
{
  "schedule": [
    {
      "dateID": "Ngày 1",
      "meals": [
        {
          "nameMeals": "Tên món",
          "description": "Mô tả ngắn",
          "totalCalor": 350
        }
      ]
    }
  ],
  "nutrition": {
    "calories": number,
    "protein": number,
    "fat": number,
    "carbs": number
  }
}
`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "meal_plan_schema",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              schedule: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    dateID: { type: "string" },
                    meals: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          nameMeals: { type: "string" },
                          description: { type: "string" },
                          totalCalor: { type: "number" }
                        },
                        required: ["nameMeals", "description", "totalCalor"]
                      }
                    }
                  },
                  required: ["dateID", "meals"]
                }
              },
              nutrition: {
                type: "object",
                additionalProperties: false,
                properties: {
                  calories: { type: "number" },
                  protein: { type: "number" },
                  fat: { type: "number" },
                  carbs: { type: "number" }
                },
                required: ["calories", "protein", "fat", "carbs"]
              }
            },
            required: ["schedule", "nutrition"]
          },
          strict: true
        }
      }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    console.error("❌ Lỗi generateMealPlanAI:", err);
    throw new Error("AI không thể tạo meal plan");
  }
}
