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
      mealTimes: Array.isArray(userInfo.mealTimes)
        ? userInfo.mealTimes
        : ["07:00", "12:00", "18:30"],
    };

    // ⚙️ System prompt
    const systemPrompt = `
Bạn là chuyên gia dinh dưỡng tại Việt Nam.
Nhiệm vụ: tạo thực đơn ăn uống chi tiết dựa theo chỉ số dinh dưỡng đã có.
Yêu cầu:
- Nguyên liệu phổ biến ở Việt Nam, chi phí hợp lý.
- Mỗi ngày chia thành ${cleanUser.mealsPerDay} bữa ăn theo khung giờ người dùng cung cấp.
- Trong mỗi bữa, chỉ liệt kê tên món ăn không chứa khối lượng hay số lượng, cách nhau dấu phẩy (ví dụ: "Cơm, thịt heo nạc rim, rau củ luộc").
- Tổng năng lượng chia nếu là 3 bữa : sáng 25%, trưa 40%, tối 35%.
- Tổng năng lượng chia nếu là 4 bữa :  ( Sáng 25%, trưa 35%, chiều 10% , Tối 30% ) hoặc (Sáng 25% ,phụ sáng  10% ,  trưa 35%, Tối 30% ) tùy theo user chọn bữa phụ khi nào.
- Tổng năng lượng chia nếu là 5 bữa : Sáng 20% , phụ sáng  10% , trưa 35%, chiều 10% , Tối 25%
- 
- Nếu bữa ăn không thuộc sáng/trưa/tối (bữa phụ), chỉ nên là món nhẹ như trái cây, sữa chua, sinh tố, hạt, snack v.v.
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
- Số bữa mỗi ngày: ${cleanUser.mealsPerDay}
- Giờ ăn trong ngày: ${cleanUser.mealTimes.join(", ")} 
Yêu cầu:
- Tạo ${cleanUser.dateTemplate} ngày thực đơn khác nhau.
- Mỗi ngày có ${cleanUser.mealsPerDay} bữa tương ứng với khung giờ trên.
- Các bữa sáng/trưa/tối là bữa chính, món ăn phải đủ năng lượng và đa dạng.
- Mỗi ngày ${cleanUser.mealsPerDay} bữa, tổng calo xấp xỉ ${nutritionNeeds.calories} kcal/ngày.
- Mỗi bữa phải có đủ 4 chỉ số [Calories, Protein, Fat, Carbs] và lưu trong mảng “CPFCa” theo đúng thứ tự [calo, protein, fat, carbs].
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
                          CPFCa: {
                            type: "array",
                            items: { type: "number" },
                            minItems: 4,
                            maxItems: 4,
                            description: "[Calories, Protein, Fat, Carbs]"
                          }
                        },
                        required: ["nameMeals", "description", "CPFCa"],
                      },
                    },
                  },
                  required: ["dateID", "meals"],
                },
              },
            },
            required: ["schedule"]
          },
          strict: true,
        },
      },
      // ❌ bỏ temperature vì gpt-5-mini không hỗ trợ
    });

    // ✅ Parse kết quả JSON
    const result = JSON.parse(response.choices[0].message.content);
    const mealTypes = ["sáng", "trưa", "chiều"];
    const mealTimes = userInfo.mealTimes || ["07:00", "12:00", "18:30"];

    result.schedule = result.schedule.map((day) => ({
      ...day,
      meals: day.meals.map((meal, i) => {
        const type =
          i === 0 ? "bữa sáng" :
            i === 1 ? "bữa trưa" :
              i === 2 ? "bữa tối" :
                `bữa phụ ${i - 2}`;
        return {
          ...meal,
          mealType: type,
          mealTime: mealTimes[i] || null
        };
      }),
    }));
    return result;
  } catch (err) {
    console.error("❌ Lỗi generateMealPlanAI:", err);
    throw new Error("AI không thể tạo lịch ăn uống");
  }
}
