
const MealDay = require("../models/MealDay");
const MealTemplate = require("../models/mealTemplate");

/**
 * 🥗 Tạo template ăn uống từ data mẫu (MealDay + MealTemplate)
 * ✅ Lấy userId từ token, không cần truyền qua body nữa
 */
const createMealTemplate = async (req, res) => {
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
const getMealTemplate = async (req, res) => {
  try {
    const userId = req.auth?.id;
    const template = await MealTemplate.findOne({
      _id: req.params.id,
      $or: [
        { userIdCreate: userId },
        { "sharedWith.userId": userId }
      ]
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
const getAllMealTemplatesByUser = async (req, res) => {
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
const shareTemplateWithUser = async (req, res) => {
  try {
    const { templateId, toUserId, status = "pending" } = req.body;
    const userId = req.auth?.id;
    if (toUserId === userId) {
      return res.status(400).json({
        message: "Không thể chia sẻ template cho chính mình 😅"
      });
    }
    if (!userId || !toUserId || !templateId)
      return res.status(400).json({ message: "Thiếu dữ liệu cần thiết" });

    const template = await MealTemplate.findOne({ _id: templateId, userIdCreate: userId });
    if (!template)
      return res.status(404).json({ message: "Không tìm thấy template của user này" });

    // ✅ Kiểm tra nếu user đã được chia sẻ trước đó
    const existing = template.sharedWith.find(s => s.userId === toUserId);
    if (existing) {
      existing.status = "pending";
      existing.sharedAt = new Date();
    } else {
      template.sharedWith.push({ userId: toUserId, status });
    }

    await template.save();

    return res.status(200).json({
      message: "Đã gửi chia sẻ thành công ✅",
      sharedWith: template.sharedWith,
    });
  } catch (err) {
    console.error("❌ Lỗi shareTemplateWithUser:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ✅ Chấp nhận chia sẻ template
const acceptShare = async (req, res) => {
  try {
    const userId = req.auth?.id;
    const { templateId, shareFrom } = req.body;

    if (!userId || !templateId || !shareFrom)
      return res.status(400).json({ message: "Thiếu dữ liệu cần thiết" });

    const template = await MealTemplate.findOne({ _id: templateId });
    if (!template)
      return res.status(404).json({ message: "Không tìm thấy template" });

    const shared = template.sharedWith.find(s => s.userId === userId);
    if (!shared)
      return res.status(403).json({ message: "Template này chưa được chia sẻ cho bạn" });

    if (shared.status === "accepted")
      return res.status(400).json({ message: "Bạn đã chấp nhận chia sẻ này trước đó" });

    shared.status = "accepted";
    shared.acceptedAt = new Date();

    await template.save();

    return res.status(200).json({
      status: "ok",
      message: "Chấp nhận chia sẻ thành công ✅",
      templateId
    });
  } catch (err) {
    console.error("❌ Lỗi acceptShare:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ❌ Từ chối chia sẻ template
const declineShare = async (req, res) => {
  try {
    const userId = req.auth?.id;
    const { templateId } = req.body;

    if (!userId || !templateId)
      return res.status(400).json({ message: "Thiếu dữ liệu cần thiết" });

    const template = await MealTemplate.findOne({ _id: templateId });
    if (!template)
      return res.status(404).json({ message: "Không tìm thấy template" });

    const shared = template.sharedWith.find(s => s.userId === userId);
    if (!shared)
      return res.status(403).json({ message: "Template này chưa được chia sẻ cho bạn" });

    shared.status = "declined";
    await template.save();

    return res.status(200).json({
      message: "Từ chối chia sẻ thành công ✅",
      templateId
    });
  } catch (err) {
    console.error("❌ Lỗi declineShare:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


// 📥 Lấy danh sách template được chia sẻ với user hiện tại
const getSharedTemplates = async (req, res) => {
  try {
    const userId = req.auth?.id;
    const templates = await MealTemplate.find({
      "sharedWith.userId": userId
    }).lean();

    if (!templates.length)
      return res.status(200).json({ message: "Không có template nào được chia sẻ với bạn" });

    // Lọc theo status
    const shared = templates.map(t => {
      const info = t.sharedWith.find(s => s.userId === userId);
      return {
        templateId: t._id,
        goal: t.goal,
        kgGoal: t.kgGoal,
        sharedBy: t.userIdCreate,
        status: info?.status,
        sharedAt: info?.sharedAt,
        acceptedAt: info?.acceptedAt
      };
    });

    res.status(200).json({
      message: "Lấy danh sách template được chia sẻ thành công ✅",
      total: shared.length,
      templates: shared
    });

  } catch (err) {
    console.error("❌ Lỗi getSharedTemplates:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

const getMealStats = async (req, res) => {
  try {
    // --- 1️⃣ Tổng số template ---
    const totalTemplates = await MealTemplate.countDocuments();

    // --- 2️⃣ Đếm theo số ngày mẫu (maintainDuration = 3,4,5,...) ---
    const templatesByDays = await MealTemplate.aggregate([
      {
        $project: {
          daysCount: { $size: "$dayTemplate" } // lấy độ dài mảng dayTemplate
        }
      },
      {
        $group: {
          _id: "$daysCount",
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // --- 3️⃣ Xác định số ngày mẫu được dùng nhiều nhất ---
    let mostUsedDuration = null;
    if (templatesByDays.length > 0) {
      const max = Math.max(...templatesByDays.map(d => d.count));
      const maxItem = templatesByDays.find(d => d.count === max);
      mostUsedDuration = maxItem ? maxItem._id : null;
    }

  

    // --- 5️⃣ Lấy 3 template mới nhất ---
    const latestTemplates = await MealTemplate.find({}, { _id: 1, userIdCreate: 1, description: 1 })
      .sort({ createdAt: -1 })
      .limit(3);

   

    return res.json({
      totalTemplates,
      templatesByDays,
      mostUsedDuration,
    
      latestTemplates,
     
    });
  } catch (error) {
    console.error("❌ getMealStats error:", error);
    return res.status(500).json({ message: "Lỗi khi lấy thống kê", error: error.message });
  }
};


module.exports = {
  createMealTemplate,
  getMealTemplate,
  getAllMealTemplatesByUser,
  shareTemplateWithUser,
  getSharedTemplates,
  getMealStats, acceptShare, declineShare
};