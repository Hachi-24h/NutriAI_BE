import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateMealPlanAI(userInfo, nutritionNeeds) {
  try {
    // 🧩 Chỉ giữ thông tin cần thiết
    const cleanUser = {
      mealsPerDay: userInfo.mealsPerDay || 3,
      dateTemplate: userInfo.dateTemplate || 5,
      dietaryRestrictions: userInfo.dietaryRestrictions || [],
      budget: userInfo.budget || "vừa phải",
      cookingPreference: userInfo.cookingPreference || "dễ nấu",
      healthConditions: userInfo.healthConditions?.filter(v => v) || [],
      extraNotes: userInfo.extraNotes || "",
    };

    // ⚙️ System prompt
    const systemPrompt = `
Bạn là chuyên gia dinh dưỡng tại Việt Nam.
Nhiệm vụ: tạo thực đơn ăn uống chi tiết dựa theo chỉ số dinh dưỡng đã có.
Yêu cầu:
- Nguyên liệu phổ biến ở Việt Nam, chi phí hợp lý.
- Mỗi ngày chia thành ${cleanUser.mealsPerDay} bữa: sáng, trưa, tối.
- Trong mỗi bữa, chỉ liệt kê tên món ăn không chứa khối lượng hay số lượng, cách nhau dấu phẩy (ví dụ: "Cơm, thịt heo nạc rim, rau củ luộc").
- Tổng năng lượng chia: sáng 25%, trưa 40%, tối 35%.
- Mỗi bữa phải có đủ: calories, protein, fat, carbs.
- Nếu có bệnh lý, loại bỏ món không phù hợp.
- mô tả mon ăn ngắn gọn không quá 30 chữ: như bao nhiêu gram, cách nấu, gia vị, ..., với trái cây thì ghi rõ loại 
- Trả về JSON đúng schema, không thêm text khác.
`;

    // 💬 User prompt
    const userPrompt = `
Tạo thực đơn trong ${cleanUser.dateTemplate} ngày dựa theo thông tin sau:

📋 Ghi chú dinh dưỡng từ chuyên gia:
"${nutritionNeeds.notes}"

Nhu cầu dinh dưỡng mỗi ngày:
- Calories: ${nutritionNeeds.calories} kcal
- Protein: ${nutritionNeeds.protein} g
- Fat: ${nutritionNeeds.fat} g
- Carbs: ${nutritionNeeds.carbs} g

Thông tin người dùng:
- Dị ứng / kiêng: ${cleanUser.dietaryRestrictions.join(", ") || "Không có"}
- Sở thích: ${cleanUser.extraNotes || "Không có"}
- Tình trạng sức khỏe: ${cleanUser.healthConditions.join(", ") || "Không có"}
- Ngân sách: ${cleanUser.budget}
- Cách nấu: ${cleanUser.cookingPreference}

Yêu cầu:
- Tạo ${cleanUser.dateTemplate} ngày thực đơn khác nhau.
- Mỗi ngày ${cleanUser.mealsPerDay} bữa, tổng calo xấp xỉ ${nutritionNeeds.calories} kcal/ngày.
- Mỗi bữa phải có calories, protein, fat, carbs tương ứng.
- Phân bổ macro theo tỉ lệ: sáng 25%, trưa 40%, tối 35%.
`;

    // 🚀 Gọi AI
    const response = await client.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "meal_plan_schema",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              notes: { type: "string" },
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
                          calories: { type: "number" },
                          protein: { type: "number" },
                          fat: { type: "number" },
                          carbs: { type: "number" },
                        },
                        required: [
                          "nameMeals",
                          "description",
                          "calories",
                          "protein",
                          "fat",
                          "carbs",
                        ],
                      },
                    },
                  },
                  required: ["dateID", "meals"],
                },
              },
            },
            required: ["notes", "schedule"]
          },
          strict: true,
        },
      },
      // ❌ bỏ temperature vì gpt-5-mini không hỗ trợ
    });

    // ✅ Parse kết quả JSON
    const result = JSON.parse(response.choices[0].message.content);
    return result.schedule;
  } catch (err) {
    console.error("❌ Lỗi generateMealPlanAI:", err);
    throw new Error("AI không thể tạo lịch ăn uống");
  }
}
