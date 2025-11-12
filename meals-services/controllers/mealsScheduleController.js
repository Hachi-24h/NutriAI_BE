import MealDay from "../models/MealDay.js";
import MealTemplate from "../models/mealTemplate.js";

/**
 * 🥗 Tạo template ăn uống từ data mẫu (MealDay + MealTemplate)
 * ✅ Lấy userId từ token, không cần truyền qua body nữa
 */
export const createMealTemplate = async (req, res) => {
  try {
    const { goal, kgGoal, duration, BMIUser, schedule } = req.body;
    const userId = req.auth?.id; // 🔐 Lấy từ token

    if (!userId) return res.status(401).json({ message: "Thiếu hoặc sai token xác thực" });
    if (!schedule || schedule.length === 0)
      return res.status(400).json({ message: "Thiếu dữ liệu đầu vào (schedule)" });

    // 1️⃣ Lưu từng ngày ăn (MealDay)
    const mealDayIds = [];
    for (const day of schedule) {
      const newDay = await MealDay.create({
        dateID: day.dateID,
        meals: day.meals,
        createdBy: userId
      });
      mealDayIds.push(newDay._id.toString());
    }

    // 2️⃣ Lưu template tổng hợp (MealTemplate)
    const template = await MealTemplate.create({
      userIdCreate: userId,
      dayTemplate: mealDayIds,
      goal,
      kgGoal, // số ký muốn thay đổi (âm = giảm, dương = tăng)
      maintainDuration: duration,
      BMIUser
    });

    return res.status(201).json({
      message: "Tạo meal template thành công",
      template
    });
  } catch (err) {
    console.error("❌ Lỗi tạo MealTemplate:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

/**
 * 🍽️ Lấy chi tiết template (bao gồm danh sách MealDay)
 * ✅ Giới hạn chỉ cho phép user xem template của chính họ
 */
export const getMealTemplate = async (req, res) => {
  try {
    const userId = req.auth?.id;
    const template = await MealTemplate.findOne({
      _id: req.params.id,
      userIdCreate: userId
    });

    if (!template)
      return res.status(404).json({ message: "Không tìm thấy template cho user này" });

    const mealDays = await MealDay.find({ _id: { $in: template.dayTemplate } });

    return res.status(200).json({ ...template.toObject(), days: mealDays });
  } catch (err) {
    console.error("❌ Lỗi lấy MealTemplate:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

/**
 * 📋 Lấy danh sách tất cả MealTemplate của user hiện tại (từ token)
 */
export const getAllMealTemplatesByUser = async (req, res) => {
  try {
    const userId = req.auth?.id;
    if (!userId) return res.status(401).json({ message: "Thiếu hoặc sai token xác thực" });

    const templates = await MealTemplate.find({ userIdCreate: userId }).sort({ createdAt: -1 });
    if (!templates.length)
      return res.status(404).json({ message: "Chưa có meal template nào" });

    return res.status(200).json({
      message: "Lấy danh sách meal template thành công ✅",
      total: templates.length,
      templates
    });
  } catch (err) {
    console.error("❌ Lỗi lấy danh sách MealTemplate:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// 🔄 Chia sẻ template cho người dùng khá c
export const shareTemplateWithUser = async (req, res) => {
  try {
    const { templateId, toUserId } = req.body;
    const userId = req.auth?.id;

    if (!userId || !toUserId || !templateId)
      return res.status(400).json({ message: "Thiếu dữ liệu cần thiết" });

    const template = await MealTemplate.findOne({ _id: templateId, userIdCreate: userId });
    if (!template)
      return res.status(404).json({ message: "Không tìm thấy template của user này" });

    // 🔹 Thêm người nhận vào danh sách nếu chưa có
    if (!template.sharedWith.includes(toUserId)) {
      template.sharedWith.push(toUserId);
      await template.save();
    }

    res.status(200).json({ message: "Đã gửi chia sẻ thành công ✅", template });
  } catch (err) {
    console.error("❌ Lỗi shareTemplateWithUser:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// 📥 Lấy danh sách template được chia sẻ với user hiện tại
export const getSharedTemplates = async (req, res) => {
  try {
    const userId = req.auth?.id;
    const templates = await MealTemplate.find({ sharedWith: userId });

    if (!templates.length)
      return res.status(200).json({ message: "Không có template nào được chia sẻ với bạn" });

    res.status(200).json({
      message: "Lấy danh sách template được chia sẻ thành công ✅",
      total: templates.length,
      templates,
    });
  } catch (err) {
    console.error("❌ Lỗi getSharedTemplates:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
