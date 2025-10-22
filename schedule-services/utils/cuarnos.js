// utils/cuarnos.js
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Hàm sinh lịch ăn uống JSON từ prompt
 * @param {string} info - mô tả yêu cầu (vd: "3 bữa/ngày, ăn ít dầu mỡ")
 * @returns {Promise<Object>} JSON lịch ăn uống
 */
export async function cuarnos(info) {
  try {
    const schema = {
      type: "object",
      properties: {
        schedule: {
          type: "array",
          items: {
            type: "object",
            properties: {
              meal: { type: "string" },
              time: { type: "string" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    quantity: { type: "string" },
                  },
                  required: ["name", "quantity"],
                },
              },
              notes: { type: "string" },
            },
            required: ["meal", "time", "items"],
          },
        },
      },
      required: ["schedule"],
    };

    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo-1106", // bản hỗ trợ function calling
      messages: [
        {
          role: "user",
          content: `Tạo lịch trình ăn uống theo yêu cầu sau: ${info}`,
        },
      ],
      functions: [
        {
          name: "generate_meal_plan",
          description: "Sinh lịch trình ăn uống JSON",
          parameters: schema,
        },
      ],
      function_call: { name: "generate_meal_plan" },
    });

    return JSON.parse(response.choices[0].message.function_call.arguments);
  } catch (err) {
    console.error("Lỗi khi gọi OpenAI:", err);
    throw err;
  }
}
