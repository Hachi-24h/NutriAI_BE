// utils/generatePlan.js
import crypto from "crypto";

/**
 * Sinh lịch ăn uống nhiều ngày dựa trên template 7 ngày
 * @param {Array} weekMeals - JSON 7 ngày mẫu (mỗi phần tử = 1 ngày, có field schedule: [bữa ăn])
 * @param {Number} totalDays - Tổng số ngày cần tạo (vd: 14, 21, 30...)
 * @param {Date} startDate - Ngày bắt đầu
 * @returns {Array} Danh sách dateMeals theo từng ngày
 */
export function generatePlan(weekMeals, totalDays, startDate = new Date()) {
  if (!Array.isArray(weekMeals) || weekMeals.length === 0) {
    throw new Error("weekMeals không hợp lệ");
  }
  if (!totalDays || totalDays <= 0) {
    throw new Error("totalDays phải > 0");
  }

  const plan = [];

  for (let i = 0; i < totalDays; i++) {
    // lấy ngày mẫu từ weekMeals (xoay vòng 7 ngày)
    const weekIndex = i % weekMeals.length;
    const baseDay = JSON.parse(JSON.stringify(weekMeals[weekIndex]));

    if (!baseDay.schedule || !Array.isArray(baseDay.schedule)) {
      throw new Error("Mỗi ngày trong weekMeals phải có field schedule (array các bữa ăn).");
    }

    // copy các bữa trong ngày và random thứ tự
    const mealsInDay = baseDay.schedule.sort(() => Math.random() - 0.5);

    // gán dateID (YYYY-MM-DD)
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const dateID = currentDate.toISOString().split("T")[0];

    // map dữ liệu thành DateMeals + MealsTime + Meals
    const dateMeals = {
      dateID,
      listMealsTime: mealsInDay.map(meal => {
        const mealsTimeId = crypto.randomUUID();
        meal._id = mealsTimeId;

        meal.items.forEach(item => {
          item._id = crypto.randomUUID();
        });

        return mealsTimeId;
      }),
      mealsTime: mealsInDay.map(meal => ({
        _id: meal._id,
        typeTime: meal.meal.toUpperCase(), // BREAKFAST, LUNCH, DINNER
        time: meal.time,
        listMeals: meal.items.map(item => item._id),
        notes: meal.notes || "",
      })),
      meals: mealsInDay.flatMap(meal =>
        meal.items.map(item => ({
          _id: item._id,
          nameMeals: item.name,
          description: item.description || "",
          totalCalor: item.calories || 0,
        }))
      ),
    };

    plan.push(dateMeals);
  }

  return plan;
}
