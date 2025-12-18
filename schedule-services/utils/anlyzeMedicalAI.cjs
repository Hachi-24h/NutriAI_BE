const OpenAI = require("openai").default;
const dotenv = require("dotenv");

dotenv.config({ path: "../.env" });

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Phân tích thực đơn theo bệnh lý + thời gian duy trì
 * FINAL VERSION:
 * - Tính tần suất TRONG NGÀY
 * - Tính tần suất LẶP THEO THỜI GIAN
 * - Kết hợp 2 tầng để kết luận
 */
async function analyzeMealPlanForDiseaseAI({
  diseases = [],
  durationDays = 0,
  mealPlan = [],
}) {
  // ===== VALIDATION =====
  if (
    !Array.isArray(diseases) ||
    !Array.isArray(mealPlan) ||
    typeof durationDays !== "number"
  ) {
    throw new Error("Input không hợp lệ");
  }

  if (!diseases.length || !mealPlan.length || durationDays <= 0) {
    return {
      result: "ĐẠT",
      foodsShouldChange: [],
      suggestedReplacements: [],
      adviceForAcceptableFoods: [],
      reason: "Không đủ dữ liệu để đánh giá.",
    };
  }

  const templateDays = mealPlan.length;
  const repeatCount = Math.floor(durationDays / templateDays);

  // ===== SYSTEM PROMPT =====
  const systemPrompt = `
Bạn là hệ thống AI phân tích dinh dưỡng & bệnh lý, thiên về ĐÁNH GIÁ RỦI RO TÍCH LŨY.

========================
NGUYÊN TẮC CỐT LÕI
========================
- KHÔNG cấm đoán vô lý
- KHÔNG đánh giá từng ngày đơn lẻ
- KHÔNG suy diễn rằng món xuất hiện mỗi ngày nếu template không có
- Chỉ kết luận mạnh khi có RỦI RO TÍCH LŨY RÕ RÀNG

========================
QUY ƯỚC VỀ TEMPLATE
========================
- mealPlan là TEMPLATE gồm ${templateDays} ngày
- Thực đơn được lặp lại để đủ ${durationDays} ngày
- Số lần lặp = ${repeatCount}
- Tần suất dài hạn = số lần trong template × số lần lặp

========================
PHÂN TÍCH 2 TẦNG (BẮT BUỘC)
========================

TẦNG 1 — TẦN SUẤT TRONG NGÀY:
- Với mỗi món, phân tích số lần xuất hiện TRONG CÙNG 1 NGÀY
- Nếu ≥ 2 lần/ngày → "tần suất cao trong ngày"
- Nếu ≥ 3 lần/ngày → "tần suất rất cao trong ngày"

ĐẶC BIỆT VỚI ĐỒ UỐNG CÓ ĐƯỜNG / ĐƯỜNG LỎNG:
- ≥ 2 lần/ngày → cảnh báo rõ ràng (đặc biệt với tiểu đường)

TẦNG 2 — TẦN SUẤT THEO THỜI GIAN:
- Dựa trên số lần lặp của template
- Đánh giá nguy cơ tích lũy dài hạn

========================
CÁCH KẾT LUẬN
========================
- Nếu TẦNG 1 CAO + TẦNG 2 CAO → "nguy hiểm nếu dùng dài hạn"
- Nếu chỉ 1 trong 2 cao → "nguy cơ tích lũy"
- Nếu cả 2 thấp → chấp nhận được nếu kiểm soát

========================
QUY TẮC RIÊNG CHO TIỂU ĐƯỜNG
========================
- Đồ uống có đường (trà tắc, trà sữa, nước ép):
  • RẤT NHẠY với tần suất trong ngày
  • Uống nhiều lần/ngày dù không mỗi ngày vẫn có rủi ro
- Chỉ coi là "nguy hiểm" khi:
  • uống nhiều lần/ngày
  • và lặp lại trong nhiều tuần

========================
OUTPUT
========================
- Chỉ trả về JSON
- Không dọa
- Không nói chết chóc
- Luôn có gợi ý điều chỉnh
`;

  // ===== USER PROMPT =====
  const userPrompt = `
INPUT:

Danh sách bệnh lý:
${diseases.map(d => `- ${d}`).join("\n")}

Thời gian duy trì thực đơn: ${durationDays} ngày
Template gồm ${templateDays} ngày, lặp ${repeatCount} lần

Danh sách ngày & bữa ăn (TEMPLATE):
${mealPlan
  .map(
    d => `
${d.dateID}:
${(d.meals || []).map(m => `- ${m.name}`).join("\n")}`
  )
  .join("\n")}

YÊU CẦU PHÂN TÍCH:
1. Chuẩn hóa & tách món (bỏ số lượng, chữ thừa)
2. Phân tích TẦN SUẤT TRONG NGÀY cho từng món
3. Phân tích TẦN SUẤT THEO THỜI GIAN (lặp template)
4. Kết hợp 2 tầng để đánh giá rủi ro
5. Kết luận:
   - "ĐẠT" nếu không có món nguy hiểm dài hạn
   - "KHÔNG ĐẠT" nếu có ít nhất 1 món nguy hiểm khi duy trì

PHÂN LOẠI:
- foodsShouldChange:
  • món nguy hiểm nếu dùng dài hạn
- suggestedReplacements:
  • gợi ý giảm tần suất / thay thế
- adviceForAcceptableFoods:
  • món chưa nguy hiểm nhưng cần lưu ý

FORMAT OUTPUT (JSON DUY NHẤT):
{
  "result": "ĐẠT | KHÔNG ĐẠT",
  "foodsShouldChange": [
    {
      "name": "",
      "reason": "",
      "riskLevel": "nguy hiểm nếu dùng dài hạn | nguy cơ tích lũy"
    }
  ],
  "suggestedReplacements": [
    {
      "from": "",
      "to": ""
    }
  ],
  "adviceForAcceptableFoods": [
    {
      "name": "",
      "advice": ""
    }
  ]
}
`;

  // ===== CALL OPENAI =====
  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.15,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = completion.choices[0].message.content.trim();

  // ===== PARSE =====
  try {
    return JSON.parse(content);
  } catch (err) {
    console.error("❌ AI response không phải JSON:", content);
    throw new Error("AI trả về dữ liệu không hợp lệ");
  }
}

module.exports = {
  analyzeMealPlanForDiseaseAI,
};
