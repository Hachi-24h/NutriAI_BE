import { getNutritionData } from "../services/nutritionixService.js";
import { askOpenAI } from "../services/openaiService.js";

export const handleChat = async (req, res) => {
  const { message } = req.body;

  try {
    // Lấy dữ liệu dinh dưỡng nếu có món ăn trong tin nhắn
    const nutrition = await getNutritionData(message);

    const prompt = `
User hỏi: "${message}"
Dữ liệu dinh dưỡng: ${nutrition ? JSON.stringify(nutrition, null, 2) : "Không có dữ liệu"}

Bạn là NutriAI — chuyên gia dinh dưỡng cá nhân.
- Nếu người dùng hỏi về món ăn → mô tả calo, protein, fat, carbs.
- Nếu người dùng hỏi về mục tiêu (giảm cân, tăng cơ, duy trì) → gợi ý bữa ăn phù hợp.
- Luôn trả lời ngắn gọn, thân thiện, không vượt quá 4 câu.
`;

    const aiResponse = await askOpenAI(prompt);

    res.json({ reply: aiResponse });
  } catch (error) {
    console.error("Chatbot Error:", error);
    res.status(500).json({ reply: "Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu." });
  }
};
