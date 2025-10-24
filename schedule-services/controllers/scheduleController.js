import axios from "axios";
import Schedule from "../models/Schedule.js";

/**
 * 🧠 Tạo toàn bộ lịch trình ăn uống từ data mẫu (dùng token)
 */
export const createFullSchedule = async (req, res) => {
  try {
    const {
      height,
      weight,
      gender,
      age,
      goal,
      kgGoal,
      duration,
      startDate,
      schedule,
      nameSchedule
    } = req.body;

    const userId = req.auth?.id;
    if (!userId) return res.status(401).json({ message: "Thiếu hoặc sai token xác thực" });

    if (!schedule || schedule.length === 0 || !startDate)
      return res.status(400).json({ message: "Thiếu dữ liệu cần thiết" });

    // 1️⃣ Gọi meal-service để lưu template (token forwarding)
    const mealRes = await axios.post(
      "http://localhost:5002/meals-schedule/meal-templates",
      {
        goal,
        kgGoal,
        duration,
        BMIUser: Math.round(weight / ((height / 100) ** 2)),
        schedule
      },
      {
        headers: { Authorization: req.headers.authorization } // ✅ forward token
      }
    );

    const template = mealRes.data.template;
    if (!template || !template._id)
      return res.status(500).json({ message: "Không tạo được meal template" });

    // 2️⃣ Lấy lại chi tiết template từ meal-service
    const { data: templateDetail } = await axios.get(
      `http://localhost:5002/meals-schedule/meal-templates/${template._id}`,
      { headers: { Authorization: req.headers.authorization } } // ✅ forward token
    );

    const templateDays = templateDetail.days.map((d) => d._id);

    const daily = Array.from({ length: duration }).map((_, i) => ({
      dayOrder: i + 1,
      idMealDay: templateDays[Math.floor(Math.random() * templateDays.length)]
    }));

    // 3️⃣ Lưu Schedule
    const scheduleDoc = await Schedule.create({
      userId,
      nameSchedule:
        nameSchedule || `${goal || "Chế độ ăn"} ${new Date().toISOString().split("T")[0]}`,
      idTemplate: template._id,
      startDate,
      endDate: new Date(new Date(startDate).getTime() + duration * 24 * 60 * 60 * 1000),
      goal,
      kgGoal,
      height,
      weight,
      gender,
      age,
      daily
    });

    return res.status(201).json({
      message: "Tạo lịch trình ăn uống thành công 🎯",
      schedule: scheduleDoc
    });
  } catch (err) {
    console.error("❌ Lỗi tạo Schedule:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

/**
 * 📅 Lấy chi tiết 1 lịch trình
 */
export const getFullSchedule = async (req, res) => {
  try {
    const userId = req.auth?.id;
    const schedule = await Schedule.findOne({ _id: req.params.id, userId });

    if (!schedule)
      return res.status(404).json({ message: "Không tìm thấy lịch trình của user này" });

    const { data: template } = await axios.get(
      `http://localhost:5002/meals-schedule/meal-templates/${schedule.idTemplate}`,
      { headers: { Authorization: req.headers.authorization } } // ✅ forward token
    );

    const fullPlan = schedule.daily.map((item, idx) => {
      const mealDay = template.days.find((d) => d._id === item.idMealDay);
      const actualDate = new Date(schedule.startDate);
      actualDate.setDate(actualDate.getDate() + idx);
      return { ...mealDay, actualDate: actualDate.toISOString().split("T")[0] };
    });

    return res.status(200).json({
      scheduleInfo: {
        _id: schedule._id,
        nameSchedule: schedule.nameSchedule,
        goal: schedule.goal,
        kgGoal: schedule.kgGoal,
        height: schedule.height,
        weight: schedule.weight,
        gender: schedule.gender,
        age: schedule.age,
        duration: schedule.daily.length,
        startDate: schedule.startDate,
        endDate: schedule.endDate
      },
      fullPlan
    });
  } catch (err) {
    console.error("❌ Lỗi lấy lịch trình:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

/**
 * 📋 Lấy danh sách lịch trình của user
 */
export const getSchedulesByUser = async (req, res) => {
  try {
    const userId = req.auth?.id;
    if (!userId) return res.status(401).json({ message: "Thiếu hoặc sai token xác thực" });

    const schedules = await Schedule.find({ userId }).sort({ createdAt: -1 });
    if (!schedules.length)
      return res.status(404).json({ message: "Người dùng này chưa có lịch trình nào" });

    const data = schedules.map((s) => ({
      _id: s._id,
      nameSchedule: s.nameSchedule,
      goal: s.goal,
      kgGoal: s.kgGoal,
      status: s.status,
      startDate: s.startDate,
      endDate: s.endDate,
      createdAt: s.createdAt
    }));

    return res.status(200).json({
      message: "Lấy danh sách lịch trình thành công ✅",
      total: data.length,
      schedules: data
    });
  } catch (err) {
    console.error("❌ Lỗi lấy danh sách lịch trình:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
