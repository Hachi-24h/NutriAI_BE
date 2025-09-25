// utils/cuarnos.js
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Gọi OpenAI để sinh meal plan 7 ngày mẫu
 * @param {string} info - yêu cầu từ user (số ngày, bữa/ngày, dị ứng, mục tiêu…)
 * @returns {Object} JSON meal plan (schedule: [])
 */
export async function cuarnos(info) {
  try {
    // Schema JSON để AI trả về dữ liệu khớp với MongoDB models
    const schema = {
      type: "object",
      properties: {
        schedule: {
          type: "array",
          description: "Danh sách các bữa ăn trong một ngày",
          items: {
            type: "object",
            properties: {
              meal: {
                type: "string",
                enum: ["BREAKFAST", "LUNCH", "DINNER"], // map sang MealsTime.typeTime
              },
              time: {
                type: "string",
                pattern: "^([01]\\d|2[0-3]):[0-5]\\d$", // HH:mm format
              },
              items: {
                type: "array",
                description: "Danh sách món trong bữa",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },              // map sang Meals.nameMeals
                    description: { type: "string" },       // map sang Meals.description
                    calories: { type: "number", minimum: 0 } // map sang Meals.totalCalor
                  },
                  required: ["name"]
                }
              },
              notes: { type: "string" }
            },
            required: ["meal", "time", "items"]
          }
        }
      },
      required: ["schedule"]
    };

    // Gọi OpenAI với function-calling
    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo-1106",
      messages: [
        {
          role: "user",
          content: `Tạo lịch trình ăn uống mẫu (7 ngày) theo yêu cầu sau: ${info}`,
        },
      ],
      functions: [
        {
          name: "generate_meal_plan",
          description: "Sinh lịch trình ăn uống JSON theo schema MongoDB",
          parameters: schema,
        },
      ],
      function_call: { name: "generate_meal_plan" },
    });

    let plan;
    try {
      plan = JSON.parse(response.choices[0].message.function_call.arguments);
    } catch (parseErr) {
      console.error("❌ Lỗi parse JSON:", parseErr);
      throw new Error("AI trả về dữ liệu không hợp lệ, không parse được JSON.");
    }

    return plan;
  } catch (err) {
    console.error("❌ Lỗi khi gọi OpenAI:", err.message);
    throw new Error(`OpenAI API error: ${err.message}`);
  }
}
