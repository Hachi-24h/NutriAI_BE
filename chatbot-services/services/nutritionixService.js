import fetch from "node-fetch";

export async function getNutritionData(query) {
  try {
    const response = await fetch("https://trackapi.nutritionix.com/v2/natural/nutrients", {
      method: "POST",
      headers: {
        "x-app-id": process.env.NUTRITIONIX_APP_ID,
        "x-app-key": process.env.NUTRITIONIX_APP_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    return data.foods?.[0] || null;
  } catch (err) {
    console.error("Nutritionix API Error:", err);
    return null;
  }
}
