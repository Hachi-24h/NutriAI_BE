import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Gọi OpenAI để sinh meal plan 7 ngày
 * @param {Object} userInfo - thông tin user đã chuẩn hóa
 * @param {Object} nutritionNeeds - nhu cầu calo & macros mỗi ngày
 * @returns {Object} JSON meal plan
 */
export async function cuarnos(userInfo, nutritionNeeds) {
  // Schema chuẩn để AI trả về JSON
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      schedule: {
        type: "array",
        description: "Danh sách thực đơn 7 ngày",
        minItems: 7,
        maxItems: 7,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            dateID: { type: "string", description: "Ngày yyyy-mm-dd" },
            mealsTime: {
              type: "array",
              description: "Danh sách bữa ăn trong ngày",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  typeTime: {
                    type: "string",
                    enum: ["BREAKFAST", "LUNCH", "DINNER", "SNACK"]
                  },
                  time: { type: "string", description: "Giờ ăn (HH:mm)" },
                  listMeals: {
                    type: "array",
                    minItems: 1,
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
                  },
                  notes: { type: "string" }
                },
                required: ["typeTime", "time", "listMeals", "notes"]
              }
            }
          },
          required: ["dateID", "mealsTime"]
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
  };

  const systemPrompt = `
Bạn là chuyên gia dinh dưỡng người Việt. 
Nhiệm vụ: tạo thực đơn 7 ngày cho người dùng với mục tiêu "${userInfo.goal}".

⚡️ Nguyên tắc:
- Tổng mỗi ngày: ~${nutritionNeeds.calories} kcal 
  (Protein ~${nutritionNeeds.protein}g, Fat ~${nutritionNeeds.fat}g, Carb ~${nutritionNeeds.carbs}g).
- Mỗi ngày chia ${userInfo.mealsPerDay || 3} bữa, có thể thêm bữa phụ (SNACK).
- Bữa sáng có thể nhẹ (trái cây, sữa chua, yến mạch), bữa trưa và tối cân đối hơn.
- Tránh món chiên/rán/dầu mỡ nếu mục tiêu là giảm cân hoặc có bệnh tim mạch.
- Tránh các thực phẩm trong danh sách kiêng/dị ứng của user.
- Trả về JSON đúng schema.`.trim();

  const userPrompt = `
Thông tin người dùng: ${JSON.stringify(userInfo)}
Nhu cầu dinh dưỡng mỗi ngày: ${JSON.stringify(nutritionNeeds)}
Hãy sinh ra thực đơn 7 ngày theo schema JSON.
`.trim();

  try {
    const response = await client.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "meal_plan_schema",
          schema: schema,
          strict: true
        }
      }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    console.error("❌ Lỗi cuarnos:", err);
    throw new Error("AI không thể tạo meal plan");
  }
}