import axios from "axios";
import Schedule from "../models/Schedule.js";

/**
 * Tạo lịch ăn uống cá nhân từ template
 */
export const createSchedule = async (req, res) => {
  try {
    const { userId, title, description, templateId, startDate, daysToDistribute, goal, weight } = req.body;

    if (!templateId || !userId || !startDate) {
      return res.status(400).json({ message: "Thiếu dữ liệu bắt buộc" });
    }

    // 1️⃣ Gọi meal-service để lấy template
    const { data: template } = await axios.get(`${process.env.MEAL_SERVICE_URL}/meal-templates/${templateId}`);
    const templateDays = template.days.map(d => d.dateID);

    if (!templateDays || templateDays.length === 0) {
      return res.status(400).json({ message: "Template không hợp lệ hoặc không có ngày ăn" });
    }

    // 2️⃣ Random các ngày từ template
    const randomPlan = Array.from({ length: daysToDistribute }).map((_, i) => ({
      dayOrder: i + 1,
      templateDay: templateDays[Math.floor(Math.random() * templateDays.length)]
    }));

    // 3️⃣ Lưu schedule
    const schedule = await Schedule.create({
      userId,
      title: title || `Kế hoạch ${goal || ""}`.trim(),
      description: description || `Mục tiêu: ${goal} - Cân nặng: ${weight}kg`,
      templateId,
      startDate,
      daysToDistribute,
      dailyPlan: randomPlan
    });

    return res.status(201).json({
      message: "Tạo lịch ăn thành công",
      schedule
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

/**
 * Lấy full lịch ăn kèm chi tiết món ăn
 */
export const getFullSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ message: "Không tìm thấy schedule" });

    // Gọi meal-service để lấy template + MealDay
    const { data: template } = await axios.get(`${process.env.MEAL_SERVICE_URL}/meal-templates/${schedule.templateId}`);

    // Map ngày ăn thực tế
    const fullPlan = schedule.dailyPlan.map((d, i) => {
      const templateDay = template.days.find(t => t.dateID === d.templateDay);
      const actualDate = new Date(schedule.startDate);
      actualDate.setDate(actualDate.getDate() + (i));
      return { ...templateDay, actualDate: actualDate.toISOString().split("T")[0] };
    });

    return res.json({
      _id: schedule._id,
      title: schedule.title,
      goal: schedule.description,
      startDate: schedule.startDate,
      fullPlan
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


export const createFullScheduleFlow = async (req, res) => {
  try {
    const {
      userId,
      startDate,
      daysToDistribute,
      goal,
      weight,
      name,
      description,
      schedule // danh sách Day1, Day2, Day3...
    } = req.body;

    if (!userId || !startDate || !schedule || schedule.length === 0) {
      return res.status(400).json({ message: "Thiếu dữ liệu cần thiết" });
    }

    // === 1️⃣ GỌI MEAL-SERVICE: Tạo MealTemplate ===
    const mealServiceURL = process.env.MEAL_SERVICE_URL;
    const { data: mealTemplateRes } = await axios.post(`${mealServiceURL}/meal-templates`, {
      name: name || "Meal Plan Mẫu",
      description: description || `Tạo từ mục tiêu ${goal || "chung"}`,
      createdBy: userId,
      schedule
    });

    const template = mealTemplateRes.template;
    if (!template || !template._id) {
      return res.status(500).json({ message: "Không tạo được template ăn uống" });
    }

    // === 2️⃣ RANDOM các ngày từ template ===
    const { data: templateDetail } = await axios.get(`${mealServiceURL}/meal-templates/${template._id}`);
    const templateDays = templateDetail.days.map(d => d.dateID);

    const dailyPlan = Array.from({ length: daysToDistribute }).map((_, i) => ({
      dayOrder: i + 1,
      templateDay: templateDays[Math.floor(Math.random() * templateDays.length)]
    }));

    // === 3️⃣ LƯU SCHEDULE ===
    const scheduleDoc = await Schedule.create({
      userId,
      title: name || `Lịch ăn ${goal}`,
      description: `Mục tiêu: ${goal} - Cân nặng: ${weight}kg`,
      templateId: template._id,
      startDate,
      daysToDistribute,
      dailyPlan
    });

    // === 4️⃣ TRẢ VỀ KẾT QUẢ HOÀN CHỈNH ===
    return res.status(201).json({
      message: "Tạo lịch ăn uống thành công 🎯",
      schedule: {
        scheduleId: scheduleDoc._id,
        title: scheduleDoc.title,
        startDate: scheduleDoc.startDate,
        goal,
        weight,
        templateId: template._id,
        dailyPlan: scheduleDoc.dailyPlan
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Lỗi khi tạo lịch ăn tự động",
      error: err.message
    });
  }
};