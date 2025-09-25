// controllers/mealsController.js
const { detectFood } = require("../services/foodAI");
const Meals = require("../models/meals");
const MealsTime = require("../models/mealsTime");
const DateMeals = require("../models/dateMeals");

exports.scanMeal = async (req, res) => {
  try {
    const { typeTime } = req.body; // BREAKFAST/LUNCH/DINNER
    const { file } = req;
    if (!file) return res.status(400).json({ message: "No image uploaded" });

    // 1. Nhận diện món từ AI
    const result = await detectFood(file.path);

    // 2. Lưu món ăn
    const newMeal = await Meals.create({
      nameMeals: result.foodName,
      description: "AI detected",
      totalCalor: result.calories
    });

    // 3. Tạo hoặc tìm DateMeals
    const today = new Date().toISOString().split("T")[0];
    let dateDoc = await DateMeals.findOne({ dateID: today });
    if (!dateDoc) {
      dateDoc = await DateMeals.create({ dateID: today, listMealsTime: [] });
    }

    // 4. Tạo hoặc tìm MealsTime
    let mealsTimeDoc = await MealsTime.findOne({ typeTime });
    if (!mealsTimeDoc) {
      mealsTimeDoc = await MealsTime.create({
        typeTime,
        time: new Date().toTimeString().slice(0, 5),
        listMeals: []
      });
      dateDoc.listMealsTime.push(mealsTimeDoc._id);
      await dateDoc.save();
    }

    // 5. Gắn món vào bữa ăn
    mealsTimeDoc.listMeals.push(newMeal._id);
    await mealsTimeDoc.save();

    // 6. Populate để trả về chi tiết thay vì chỉ trả ID
    const populatedMealsTime = await MealsTime.findById(mealsTimeDoc._id).populate("listMeals");

    return res.json({
      date: dateDoc.dateID,
      typeTime: populatedMealsTime.typeTime,
      meals: populatedMealsTime.listMeals // 👈 full object
    });
  } catch (err) {
    console.error("ScanMeal error:", err);
    return res.status(500).json({ message: "Scan failed", error: err.message });
  }
};

// 👇 getMealsByDate giữ nguyên
exports.getMealsByDate = async (req, res) => {
  try {
    const { dateID } = req.params;

    const dateDoc = await DateMeals.findOne({ dateID })
      .populate({
        path: "listMealsTime",
        populate: { path: "listMeals" }
      });

    if (!dateDoc) {
      return res.status(404).json({ message: "No meals found for this date" });
    }

    return res.json(dateDoc);
  } catch (err) {
    console.error("GetMealsByDate error:", err.message);
    return res.status(500).json({ message: "Get meals by date failed" });
  }
};
