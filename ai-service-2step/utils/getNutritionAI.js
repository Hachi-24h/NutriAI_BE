import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getNutritionAI(userInfo) {
  const prompt = `
Bạn là chuyên gia dinh dưỡng.
Nhiệm vụ: Tính nhu cầu dinh dưỡng hằng ngày (Calories, Protein, Fat, Carbs) để đạt mục tiêu "${userInfo.goal}".
Thông tin người dùng: ${JSON.stringify(userInfo)}

⚠️ Lưu ý khi có bệnh lý:
- Tim mạch: giảm chất béo bão hòa, ưu tiên chất béo tốt (omega-3, dầu olive). Giữ fat ở mức 20–25% calo.
- Tiểu đường / kháng insulin: giảm carb tinh chế, ưu tiên carb phức hợp. Carb 40–45% calo.
- Bệnh thận: hạn chế protein (0.6–0.8 g/kg), tăng carb/fat để bù.
- Nếu không có bệnh lý nghiêm trọng: dùng tỉ lệ chuẩn (Protein 1.6–2.0 g/kg, Fat 25–30% calo, còn lại Carb).

- Phần "notes" chỉ tóm gọn trong 2–3 câu, dễ hiểu, gồm:
  1. Gợi ý món ăn nên ăn và nên tránh.
  2. Gợi ý vận động/lối sống phù hợp.

Trả về JSON:
{
  "calories": number,
  "protein": number,
  "fat": number,
  "carbs": number,
  "notes": string
}
`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "nutrition_schema",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              calories: { type: "number" },
              protein: { type: "number" },
              fat: { type: "number" },
              carbs: { type: "number" },
              notes: { type: "string" }
            },
            required: ["calories", "protein", "fat", "carbs", "notes"]
          },
          strict: true
        }
      }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    console.error("❌ Lỗi getNutritionAI:", err);
    throw new Error("AI không thể tính nhu cầu dinh dưỡng");
  }
}
