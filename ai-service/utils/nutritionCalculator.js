/**
 * Hàm tính toán nhu cầu dinh dưỡng (Calories, Protein, Fat, Carbs) cho user
 * @param {Object} userInfo - Thông tin user từ parseUserInfo.js
 * @returns {Object} nutritionNeeds
 */
export function calculateNutritionNeeds(userInfo) {
  const { age, weight, height, gender, activity, goal } = userInfo;

  // 1. BMR (Basal Metabolic Rate) theo Harris-Benedict
  let BMR;
  if (gender && gender.toLowerCase().includes("nữ")) {
    BMR = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    BMR = 10 * weight + 6.25 * height - 5 * age + 5;
  }

  // 2. Hệ số hoạt động (TDEE multiplier)
  let multiplier = 1.2;
  if (activity && activity.toLowerCase().includes("vừa")) multiplier = 1.55;
  if (activity && (activity.toLowerCase().includes("cao") || activity.toLowerCase().includes("nặng"))) {
    multiplier = 1.725;
  }

  let TDEE = BMR * multiplier;

  // 3. Điều chỉnh theo mục tiêu
  if (goal && goal.toLowerCase().includes("giảm cân")) TDEE -= 500;
  if (goal && goal.toLowerCase().includes("tăng cân")) TDEE += 500;

  // 4. Tính macros
  const proteinPerKg = goal && goal.toLowerCase().includes("tăng cơ") ? 2.0 : 1.6;
  const protein = Math.round(weight * proteinPerKg);
  const fat = Math.round((TDEE * 0.25) / 9);
  const carbs = Math.round((TDEE - (protein * 4 + fat * 9)) / 4);

  return {
    calories: Math.round(TDEE),
    protein,
    fat,
    carbs
  };
}
