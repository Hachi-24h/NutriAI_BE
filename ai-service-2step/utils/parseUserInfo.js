export function parseUserInfo(body) {
  return {
    goal: body.goal ? body.goal.toLowerCase().trim() : null,
    age: body.age ? Number(body.age) : null,
    gender: body.gender ? body.gender.toLowerCase().trim() : null,
    weight: body.weight ? Number(body.weight) : null,
    height: body.height ? Number(body.height) : null,
    activity: body.activity ? body.activity.toLowerCase().trim() : null,
    mealsPerDay: body.mealsPerDay ? Number(body.mealsPerDay) : 3,
    dietaryRestrictions: Array.isArray(body.dietaryRestrictions) ? body.dietaryRestrictions : [],
    budget: body.budget || null,
    cookingPreference: body.cookingPreference || null,
    sleepSchedule: body.sleepSchedule || null,
    healthConditions: Array.isArray(body.healthConditions) ? body.healthConditions : [],
    extraNotes: body.extraNotes || null,
    dateTemplate: body.dateTemplate || null,
    day: body.day ? Number(body.day) : null,
  };
}
