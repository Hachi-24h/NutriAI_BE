const axios = require("axios");
const Schedule = require("../models/Schedule");

/**
 * 🧠 Tạo toàn bộ lịch trình ăn uống từ data mẫu (dùng token)
 */
const createFullSchedule = async (req, res) => {
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
      "http://localhost:5002/meals-schedule/create-meal-templates",


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
 * 📋 Lấy danh sách lịch trình của user
 */
const getSchedulesByUser = async (req, res) => {
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

/**
 * 📅 Lấy chi tiết 1 lịch trình (có danh sách ngày và chi tiết bữa ăn)
 */
const getFullSchedule = async (req, res) => {
  try {
    const userId = req.auth?.id;
    const schedule = await Schedule.findOne({ _id: req.params.id, userId });

    if (!schedule)
      return res.status(404).json({ message: "Không tìm thấy lịch trình của user này" });

    // 🔹 Gọi meal-service để lấy chi tiết template
    const { data: template } = await axios.get(
      `http://localhost:5002/meals-schedule/meal-templates/${schedule.idTemplate}`,
      { headers: { Authorization: req.headers.authorization } }
    );

    // 🔹 Build danh sách ngày và bữa ăn chi tiết
    const fullPlan = schedule.daily.map((item, idx) => {
      const mealDay = template.days.find((d) => d._id === item.idMealDay);
      const actualDate = new Date(schedule.startDate);
      actualDate.setDate(actualDate.getDate() + idx);

      return {
        dayOrder: idx + 1,
        actualDate: actualDate.toISOString().split("T")[0],
        meals: mealDay?.meals || [],
      };
    });

    // 🔹 Trả về dữ liệu chi tiết
    return res.status(200).json({
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
      endDate: schedule.endDate,
      fullPlan,
    });
  } catch (err) {
    console.error("❌ Lỗi lấy chi tiết Schedule:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

/**
 * 🕒 Lấy bữa ăn tiếp theo trong lịch trình hiện tại của user
 * - Nếu không có lịch active → báo "Không có lịch đang thực hiện"
 * - Nếu đã qua tất cả món hôm nay → trả về món đầu tiên của ngày mai + flag `isNextDay: true`
 * - Nếu là ngày cuối và hết món → báo "Chúc mừng bạn đã hoàn thành lịch trình 🎉"
 */
const getNextMealInCurrentSchedule = async (req, res) => {
  try {
    const userId = req.auth?.id;
    if (!userId) return res.status(401).json({ message: "Thiếu hoặc sai token xác thực" });

    // 🔹 1️⃣ Tìm lịch đang active
    const schedule = await Schedule.findOne({ userId, status: "active" });
    if (!schedule) {
      return res.status(404).json({ message: "Không có lịch trình nào đang thực hiện" });
    }

    // 🔹 2️⃣ Lấy chi tiết lịch đầy đủ (bữa ăn)
    const { data: fullSchedule } = await axios.get(
      `http://localhost:5002/meals-schedule/meal-templates/${schedule.idTemplate}`,
      { headers: { Authorization: req.headers.authorization } }
    );

    // 🔹 3️⃣ Gộp ngày + bữa ăn thực tế theo thứ tự
    const days = schedule.daily.map((item, idx) => {
      const mealDay = fullSchedule.days.find((d) => d._id === item.idMealDay);
      const actualDate = new Date(schedule.startDate);
      actualDate.setDate(actualDate.getDate() + idx);
      return {
        dayOrder: idx + 1,
        actualDate: actualDate.toISOString().split("T")[0],
        meals: mealDay?.meals || [],
      };
    });

    // 🔹 4️⃣ Tính ngày hiện tại & thời gian hiện tại
    const now = new Date();
    const currentDateStr = now.toISOString().split("T")[0];
    const currentTime = now.toTimeString().slice(0, 5); // HH:mm

    // 🔹 5️⃣ Xác định ngày hiện tại trong schedule
    const currentDay = days.find((d) => d.actualDate === currentDateStr);

    // ⏳ Nếu chưa đến lịch (hôm nay trước ngày start)
    if (!currentDay && now < new Date(schedule.startDate)) {
      return res.status(200).json({
        message: "Lịch trình chưa bắt đầu",
        startDate: schedule.startDate,
      });
    }

    // ✅ Có ngày hôm nay → tìm bữa ăn tiếp theo
    if (currentDay) {
      const nextMeal = currentDay.meals.find((m) => m.mealTime > currentTime);

      if (nextMeal) {
        return res.status(200).json({
          message: "Bữa ăn sắp tới trong hôm nay 🍽️",
          isNextDay: false,
          dayOrder: currentDay.dayOrder,
          actualDate: currentDay.actualDate,
          meal: nextMeal,
        });
      }

      // Nếu hết tất cả bữa hôm nay → tìm ngày mai
      const nextDay = days.find((d) => d.dayOrder === currentDay.dayOrder + 1);
      if (nextDay) {
        return res.status(200).json({
          message: "Đã qua giờ của hôm nay, đây là bữa ăn đầu tiên của ngày mai 🌅",
          isNextDay: true,
          dayOrder: nextDay.dayOrder,
          actualDate: nextDay.actualDate,
          meal: nextDay.meals[0] || null,
        });
      }

      // Nếu hôm nay là ngày cuối cùng
      return res.status(200).json({
        message: "🎉 Chúc mừng bạn đã hoàn thành lịch trình ăn uống!",
        done: true,
      });
    }

    // ✅ Nếu đã qua toàn bộ lịch
    if (now > new Date(schedule.endDate)) {
      return res.status(200).json({
        message: "🎉 Chúc mừng bạn đã hoàn thành lịch trình ăn uống!",
        done: true,
      });
    }

    return res.status(404).json({ message: "Không tìm thấy ngày phù hợp" });
  } catch (err) {
    console.error("❌ Lỗi getNextMealInCurrentSchedule:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

module.exports = { createFullSchedule, getSchedulesByUser, getFullSchedule , getNextMealInCurrentSchedule };