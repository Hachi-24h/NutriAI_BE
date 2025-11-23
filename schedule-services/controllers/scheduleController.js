const axios = require("axios");
const Schedule = require("../models/Schedule");
const { prepareScheduleWithNutrition } = require("../utils/prepareScheduleWithNutrition");
const ScheduleResult = require("../models/ScheduleResult");
const mealsApi = (process.env.IS_DOCKER === 'true') ?
  process.env.MEAL_SERVICE_URL_DOCKER :
  process.env.MEAL_SERVICE_URL_LOCAL;

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
      nameSchedule,
      private: isPrivate = true,
      shareFrom = null, // 👈 nhận thêm nếu tạo từ shared template
      idTemplate = null // 👈 nếu user dùng template có sẵn
    } = req.body;

    const userId = req.auth?.id;
    if (!userId) return res.status(401).json({ message: "Thiếu hoặc sai token xác thực" });
    if ((!schedule || schedule.length === 0) && !idTemplate)
      return res.status(400).json({ message: "Thiếu dữ liệu schedule hoặc idTemplate" });
    if (!startDate)
      return res.status(400).json({ message: "Thiếu startDate" });

    let templateId = idTemplate;

    // 🔹 Nếu không truyền idTemplate → tạo template mới từ meal-service
    if (!idTemplate) {
      const mealRes = await axios.post(
        `${mealsApi}/create-meal-templates`,
        {
          goal,
          kgGoal,
          duration,
          BMIUser: Math.round(weight / ((height / 100) ** 2)),
          schedule
        },
        { headers: { Authorization: req.headers.authorization } }
      );
      templateId = mealRes.data.template?._id;
      if (!templateId)
        return res.status(500).json({ message: "Không tạo được meal template" });
    }

    // 🔹 Lấy lại chi tiết template để build danh sách ngày ngẫu nhiên
    
    const { data: templateDetail } = await axios.get(
      `${mealsApi}/get-meal-templates/${templateId}`,
      { headers: { Authorization: req.headers.authorization } }
    );

    const templateDays = templateDetail.days.map((d) => d._id);
    const daily = Array.from({ length: duration }).map((_, i) => ({
      dayOrder: i + 1,
      idMealDay: templateDays[Math.floor(Math.random() * templateDays.length)]
    }));

    // 🔹 Lưu schedule mới
    const scheduleDoc = await Schedule.create({
      userId,
      nameSchedule: nameSchedule || `${goal || "Chế độ ăn"} ${new Date().toISOString().split("T")[0]}`,
      idTemplate: templateId,
      startDate,
      endDate: new Date(new Date(startDate).getTime() + duration * 24 * 60 * 60 * 1000),
      goal,
      kgGoal,
      height,
      weight,
      gender,
      age,
      daily,
      shareFrom,
      private: shareFrom ? false : isPrivate // 👈 nếu được chia sẻ thì là public
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
    if (!schedules.length) {
      return res.status(200).json({
        message: "Người dùng này chưa có lịch trình nào 💤",
        hasSchedule: false,
        total: 0,
        schedules: []
      });
    }

    const data = schedules.map((s) => ({
      _id: s._id,
      nameSchedule: s.nameSchedule,
      goal: s.goal,
      kgGoal: s.kgGoal,
      status: s.status,
      startDate: s.startDate,
      endDate: s.endDate,
      createdAt: s.createdAt,
      private: s.private // ✅ thêm vào response
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
      `${mealsApi}/get-meal-templates/${schedule.idTemplate}`,
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
      private: schedule.private, // ✅ thêm ở đây
      fullPlan,
    });
  } catch (err) {
    console.error("❌ Lỗi lấy chi tiết Schedule:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

/**
 * 🕒 Lấy bữa ăn tiếp theo trong lịch trình hiện tại của user
 */
const getNextMealInCurrentSchedule = async (req, res) => {
  try {
    const userId = req.auth?.id;
    if (!userId) return res.status(401).json({ message: "Thiếu hoặc sai token xác thực" });

    // 🔹 1️⃣ Tìm lịch đang active
    const schedule = await Schedule.findOne({ userId, status: "active" });
    if (!schedule) {
      return res.status(200).json({
        message: "Người dùng hiện chưa có lịch trình nào 💤",
        hasSchedule: false,
        nextMeal: null,
      });
    }

    // 🔹 2️⃣ Lấy chi tiết meal template (gồm meals)
    const { data: fullSchedule } = await axios.get(
      `${mealsApi}/get-meal-templates/${schedule.idTemplate}`,
      { headers: { Authorization: req.headers.authorization } }
    );

    // 🔹 3️⃣ Gộp danh sách ngày + bữa ăn thực tế
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

    // 🔹 4️⃣ Lấy ngày giờ hiện tại
    const now = new Date();
    const currentDateStr = now.toISOString().split("T")[0];
    const currentTime = now.toTimeString().slice(0, 5); // HH:mm
    const start = new Date(schedule.startDate);
    const end = new Date(schedule.endDate);
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // =========================
    // 🔹 CASE 1 + 2: Chưa tới ngày bắt đầu
    // =========================
    if (currentDateStr < startStr) {
      if (tomorrowStr === startStr) {
        const firstDay = days[0];
        const firstMeal = firstDay?.meals?.[0] || null;
        return res.status(200).json({
          message: "Ngày mai là ngày bắt đầu lịch trình 🎯",
          isNextDay: true,
          startDate: schedule.startDate,
          dayOrder: firstDay?.dayOrder,
          actualDate: firstDay?.actualDate,
          meal: firstMeal,
          scheduleInfo: {
            nameSchedule: schedule.nameSchedule,
            goal: schedule.goal,
            kgGoal: schedule.kgGoal,
            duration: schedule.duration,
          },
        });
      } else {
        return res.status(200).json({
          message: "Lịch trình chưa bắt đầu",
          startDate: schedule.startDate,
          scheduleInfo: {
            nameSchedule: schedule.nameSchedule,
            goal: schedule.goal,
            kgGoal: schedule.kgGoal,
          },
        });
      }
    }

    // =========================
    // 🔹 CASE 6: Đã qua toàn bộ lịch
    // =========================
    if (currentDateStr > endStr) {
      return res.status(200).json({
        message: "🎉 Chúc mừng bạn đã hoàn thành toàn bộ lịch trình ăn uống!",
        done: true,
        scheduleInfo: {
          nameSchedule: schedule.nameSchedule,
          goal: schedule.goal,
        },
      });
    }

    // =========================
    // 🔹 CASE 3 → 5: Ngày hiện tại nằm trong lịch
    // =========================
    const currentDay = days.find((d) => d.actualDate === currentDateStr);
    if (!currentDay) {
      return res.status(404).json({ message: "Không tìm thấy dữ liệu cho ngày hiện tại" });
    }

    const firstMeal = currentDay.meals?.[0];
    const nextMeal = currentDay.meals.find((m) => m.mealTime > currentTime);

    // CASE 3: Chưa đến bữa đầu tiên
    if (firstMeal && currentTime < firstMeal.mealTime) {
      return res.status(200).json({
        message: "Hôm nay là ngày trong lịch, đây là bữa ăn đầu tiên 🍳",
        isFirstMealToday: true,
        isNextDay: false,
        dayOrder: currentDay.dayOrder,
        actualDate: currentDay.actualDate,
        meal: firstMeal,
        scheduleInfo: {
          nameSchedule: schedule.nameSchedule,
          goal: schedule.goal,
        },
      });
    }

    // CASE 4: Có bữa sắp tới trong hôm nay
    if (nextMeal) {
      return res.status(200).json({
        message: "Bữa ăn sắp tới trong hôm nay 🍽️",
        isNextDay: false,
        dayOrder: currentDay.dayOrder,
        actualDate: currentDay.actualDate,
        meal: nextMeal,
        scheduleInfo: {
          nameSchedule: schedule.nameSchedule,
          goal: schedule.goal,
        },
      });
    }

    // CASE 5: Đã qua hết bữa hôm nay
    const nextDay = days.find((d) => d.dayOrder === currentDay.dayOrder + 1);
    if (nextDay) {
      const firstMealNext = nextDay.meals?.[0] || null;
      return res.status(200).json({
        message: "Đã qua giờ của hôm nay, đây là bữa ăn đầu tiên của ngày mai 🌅",
        isNextDay: true,
        dayOrder: nextDay.dayOrder,
        actualDate: nextDay.actualDate,
        meal: firstMealNext,
        scheduleInfo: {
          nameSchedule: schedule.nameSchedule,
          goal: schedule.goal,
        },
      });
    }

    // CASE 6: Hôm nay là ngày cuối cùng và đã ăn xong
    return res.status(200).json({
      message: "🎉 Chúc mừng bạn đã hoàn thành lịch trình ăn uống!",
      done: true,
      scheduleInfo: {
        nameSchedule: schedule.nameSchedule,
        goal: schedule.goal,
      },
    });
  } catch (err) {
    console.error("❌ Lỗi getNextMealInCurrentSchedule:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

/**
 * 🧮 Chuẩn hóa dữ liệu trước khi tạo schedule chính thức
 *  - Thêm description mặc định
 *  - Tính tổng dinh dưỡng CPFCa cho từng bữa
 */
const enrichScheduleBeforeCreate = async (req, res) => {
  try {
    const inputData = req.body;
    console.log("📥 Dữ liệu nhận vào:", inputData);

    const finalSchedule = await prepareScheduleWithNutrition(inputData);

    console.log("✅ Xử lý hoàn tất — Dữ liệu lịch chuẩn:");
    res.status(200).json({
      message: "Đã xử lý lịch với dinh dưỡng thành công ✅",
      scheduleReady: finalSchedule,
    });
  } catch (err) {
    console.error("❌ Lỗi enrichScheduleBeforeCreate:", err);
    res.status(500).json({
      message: "Không thể xử lý dữ liệu trước khi tạo lịch",
      error: err.message,
    });
  }
};

/**
 * ❌ Xoá 1 lịch trình:
 * - Gọi meal-service xoá template (KHÔNG bắt buộc phải thành công)
 * - Gọi schedule-result-service xoá kết quả đánh giá (KHÔNG bắt buộc phải thành công)
 * - Sau đó xoá schedule (BẮT BUỘC thành công)
 */

const deleteSchedule = async (req, res) => {
  try {
    const userId = req.auth.id;
    const { scheduleId } = req.params;

    if (!scheduleId) {
      return res.status(400).json({ message: "Thiếu scheduleId" });
    }

    // 1️⃣ Kiểm tra schedule có tồn tại không
    const schedule = await Schedule.findOne({ _id: scheduleId, userId });
    if (!schedule) {
      return res.status(404).json({ message: "Không tìm thấy lịch để xoá" });
    }

    // 2️⃣ Xoá toàn bộ ScheduleResult cùng scheduleId
    const deletedResults = await ScheduleResult.deleteMany({ scheduleId });

    // 3️⃣ Xoá Schedule chính
    await Schedule.deleteOne({ _id: scheduleId });

    return res.status(200).json({
      message: "Đã xoá lịch và toàn bộ đánh giá liên quan thành công ✅",
      deleted: {
        scheduleId,
        scheduleResultDeleted: deletedResults.deletedCount
      }
    });

  } catch (err) {
    console.error("❌ deleteSchedule:", err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};



// ==========================
// 📊 Thống kê tổng quan Schedule
// ==========================
const getScheduleStatistics = async (req, res) => {
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Chủ nhật đầu tuần
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalByDay, totalByWeek, totalByMonth] = await Promise.all([
      Schedule.countDocuments({ createdAt: { $gte: new Date(now.setHours(0, 0, 0, 0)) } }),
      Schedule.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Schedule.countDocuments({ createdAt: { $gte: startOfMonth } })
    ]);

    const statusAgg = await Schedule.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const goalsRaw = await Schedule.find({}, { goal: 1 });
    const goalMap = { "giảm cân": 0, "tăng cân": 0, "duy trì": 0, "khác": 0 };

    goalsRaw.forEach((g) => {
      const goal = (g.goal || "").toLowerCase();

      if (goal.includes("giảm")) goalMap["giảm cân"]++;
      else if (goal.includes("tăng")) goalMap["tăng cân"]++;
      else if (goal.includes("duy trì")) goalMap["duy trì"]++;
      else goalMap["khác"]++;
    });

    const goalAgg = Object.entries(goalMap)
      .filter(([_, count]) => count > 0)
      .map(([key, count]) => ({ _id: key, count }));

    const privacyAgg = await Schedule.aggregate([
      { $group: { _id: "$private", count: { $sum: 1 } } }
    ]);

    const ageStats = await Schedule.aggregate([
      { $match: { age: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: null,
          avgAge: { $avg: "$age" },
          ageDistribution: { $push: "$age" }
        }
      }
    ]);

    const avgDaysPerSchedule = await Schedule.aggregate([
      { $project: { numDays: { $size: "$daily" } } },
      { $group: { _id: null, avgDays: { $avg: "$numDays" } } }
    ]);

    const startedThisWeek = await Schedule.countDocuments({
      startDate: { $gte: startOfWeek }
    });
    const startedThisMonth = await Schedule.countDocuments({
      startDate: { $gte: startOfMonth }
    });

    const avgDurationAgg = await Schedule.aggregate([
      {
        $project: {
          durationDays: {
            $divide: [
              { $subtract: ["$endDate", "$startDate"] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      { $group: { _id: null, avgDuration: { $avg: "$durationDays" } } }
    ]);

    return res.status(200).json({
      message: "Thống kê Schedule thành công ✅",
      totals: {
        today: totalByDay,
        thisWeek: totalByWeek,
        thisMonth: totalByMonth
      },
      status: {
        ratio: statusAgg,
        counts: Object.fromEntries(statusAgg.map(s => [s._id, s.count]))
      },
      goals: goalAgg,
      privacy: {
        ratio: privacyAgg,
        privateCount: privacyAgg.find(p => p._id === true)?.count || 0,
        publicCount: privacyAgg.find(p => p._id === false)?.count || 0
      },
      age: {
        average: ageStats[0]?.avgAge || 0,
        distribution: ageStats[0]?.ageDistribution || []
      },
      avgDaysPerSchedule: avgDaysPerSchedule[0]?.avgDays || 0,
      started: { thisWeek: startedThisWeek, thisMonth: startedThisMonth },
      avgDuration: avgDurationAgg[0]?.avgDuration || 0
    });
  } catch (err) {
    console.error("❌ Lỗi thống kê Schedule:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


module.exports = { createFullSchedule, getSchedulesByUser, getFullSchedule, getNextMealInCurrentSchedule, enrichScheduleBeforeCreate, deleteSchedule, getScheduleStatistics };