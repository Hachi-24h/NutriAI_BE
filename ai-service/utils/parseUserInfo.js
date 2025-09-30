// utils/parseUserInfo.js

/**
 * Chuẩn hóa thông tin người dùng từ body request
 * @param {Object} body - dữ liệu người dùng gửi lên
 * @returns {Object} userInfo đã chuẩn hóa
 */
export function parseUserInfo(body) {
    return {
        goal: body.goal ? body.goal.toLowerCase().trim() : null,
        age: body.age ? Number(body.age) : null,
        gender: body.gender ? body.gender.toLowerCase().trim() : null,
        weight: body.weight ? Number(body.weight) : null,
        height: body.height ? Number(body.height) : null,
        activity: body.activity ? body.activity.toLowerCase().trim() : null,
        mealsPerDay: body.mealsPerDay ? Number(body.mealsPerDay) : 3,

      dietaryRestrictions: Array.isArray(body.dietaryRestrictions)
    ? body.dietaryRestrictions.map((item) =>
        typeof item === "string" ? item.toLowerCase().trim() : item
      )
    : [],

        budget: body.budget ? body.budget.toLowerCase().trim() : null,
        cookingPreference: body.cookingPreference
            ? body.cookingPreference.toLowerCase().trim()
            : null,
        sleepSchedule: body.sleepSchedule || null,

        healthConditions: Array.isArray(body.healthConditions)
            ? body.healthConditions.map((item) =>
                typeof item === "string" ? item.toLowerCase().trim() : item
            )
            : [],

        extraNotes: body.extraNotes || body.other || null,
    };
}
