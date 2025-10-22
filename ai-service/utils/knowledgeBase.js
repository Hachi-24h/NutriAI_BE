import fs from "fs";

/**
 * Load knowledge base từ file JSON
 */
export function loadKnowledgeBase() {
  const raw = fs.readFileSync("./data/meals.json", "utf8");
  return JSON.parse(raw);
}

/**
 * Lọc món ăn theo yêu cầu của user
 * @param {Array} kb - danh sách tất cả món ăn
 * @param {Object} userInfo - thông tin user đã chuẩn hóa
 */
export function filterMeals(kb, userInfo) {
  let meals = kb;

  // 1. Loại bỏ món theo dị ứng / kiêng ăn
  if (userInfo.restrictions && userInfo.restrictions.length > 0) {
    meals = meals.filter(
      (m) =>
        !userInfo.restrictions.some((r) =>
          m.name.toLowerCase().includes(r.toLowerCase())
        )
    );
  }

  // 2. Loại bỏ món không hợp sức khỏe
  if (userInfo.healthConditions.includes("tim mạch")) {
    meals = meals.filter(
      (m) =>
        !m.description.toLowerCase().includes("chiên") &&
        !m.description.toLowerCase().includes("rán")
    );
  }

  if (userInfo.healthConditions.includes("tiểu đường")) {
    meals = meals.filter((m) => m.carb < 30); // ưu tiên low-carb
  }

  // 3. Điều chỉnh theo mục tiêu
  if (userInfo.goal.includes("giảm cân")) {
    meals = meals.filter((m) => m.calories < 300); // ưu tiên món ít calo
  }

  if (userInfo.goal.includes("tăng cơ")) {
    meals = meals.filter((m) => m.protein >= 15); // ưu tiên món giàu protein
  }

  if (userInfo.goal.includes("giữ dáng")) {
    meals = meals.filter((m) => m.calories < 400 && m.carb < 50); // ăn vừa phải
  }

  if (userInfo.goal.includes("da")) {
    meals = meals.filter((m) =>
      ["Rau", "Trái cây"].includes(m.category)
    );
  }

  // 4. Điều chỉnh theo ngân sách
  if (userInfo.budget && userInfo.budget.toLowerCase().includes("thấp")) {
    // giả định meals.json có thêm trường "price"
    meals = meals.filter((m) => m.price && m.price <= 20000);
  }

  // 5. Nếu cookingPreference = "ăn sẵn" → loại món cần nấu lâu
  if (userInfo.cookingPreference && userInfo.cookingPreference.includes("ăn sẵn")) {
    meals = meals.filter(
      (m) =>
        !m.description.toLowerCase().includes("kho") &&
        !m.description.toLowerCase().includes("ninh")
    );
  }

  // Trả về tối đa 20 món để tránh prompt quá dài
  return meals.slice(0, 20);
}
