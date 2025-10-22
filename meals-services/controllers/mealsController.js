import MealDay from "../models/MealDay.js";
import MealTemplate from "../models/mealTemplate.js";

/**
 * Tạo template mới từ data mẫu (3 ngày hoặc nhiều hơn)
 */
export const createMealTemplate = async (req, res) => {
  try {
    const { name, description, createdBy, schedule } = req.body;

    if (!schedule || schedule.length === 0) {
      return res.status(400).json({ message: "schedule không được để trống" });
    }

    // 1️⃣ Lưu từng MealDay
    const mealDayIds = [];
    for (const day of schedule) {
      const mealDay = await MealDay.create({
        dateID: day.dateID,
        meals: day.meals,
        createdBy
      });
      mealDayIds.push(mealDay._id.toString());
    }

    // 2️⃣ Tạo MealTemplate
    const template = await MealTemplate.create({
      name,
      description,
      days: mealDayIds,
      createdBy
    });

    return res.status(201).json({
      message: "Tạo template thành công",
      template
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

/**
 * Lấy chi tiết template kèm các ngày ăn
 */
export const getMealTemplate = async (req, res) => {
  try {
    const template = await MealTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ message: "Không tìm thấy template" });

    const mealDays = await MealDay.find({ _id: { $in: template.days } });

    return res.json({ ...template.toObject(), days: mealDays });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
