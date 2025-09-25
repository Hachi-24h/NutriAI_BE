// controllers/mealsController.js
const Meals = require('../models/meals');
const MealsTime = require('../models/mealsTime');   // <-- nhớ tạo file models/mealstime.js theo schema bạn đã đưa
const DateMeals = require('../models/dateMeals');   // <-- và models/datemeals.js tương tự

exports.createMeals = async (req, res) => {
  try {
    const { nameMeals, description, totalCalor } = req.body;
    if (!nameMeals || totalCalor === undefined) {
      return res.status(400).json({ message: 'nameMeals & totalCalor are required' });
    }
    const doc = await Meals.create({ nameMeals, description, totalCalor });
    res.status(201).json(doc);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Meal name already exists' });
    }
    res.status(400).json({ message: 'Create meal failed', error: err.message });
  }
};

exports.getAllMeals = async (req, res) => {
  try {
    const docs = await Meals.find().sort('-createdAt');
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: 'Get all meals failed', error: err.message });
  }
};

exports.createMealsTime = async (req, res) => {
  try {
    const { typeTime, time, listMeals } = req.body;

    // validate input cơ bản (ngoài validator của Mongoose)
    const ALLOWED = ['BREAKFAST', 'LUNCH', 'DINNER'];
    if (!typeTime || !ALLOWED.includes(typeTime)) {
      return res.status(400).json({ message: 'typeTime must be one of BREAKFAST|LUNCH|DINNER' });
    }

    const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!time || !timeRe.test(time)) {
      return res.status(400).json({ message: 'time must be HH:mm (00:00–23:59)' });
    }

    if (!Array.isArray(listMeals) || listMeals.length === 0) {
      return res.status(400).json({ message: 'listMeals must be a non-empty array of strings' });
    }

    // làm sạch
    const listMealsClean = listMeals.map(String).map(s => s.trim()).filter(Boolean);
    if (listMealsClean.length === 0) {
      return res.status(400).json({ message: 'listMeals has no usable values' });
    }

    const doc = await MealsTime.create({ typeTime, time, listMeals: listMealsClean });
    res.status(201).json(doc);
  } catch (err) {
    // Nếu bạn thêm unique index (ví dụ unique { typeTime, time }) có thể bắt 11000:
    if (err.code === 11000) {
      return res.status(409).json({ message: 'MealsTime already exists for this type/time' });
    }
    res.status(400).json({ message: 'Create mealsTime failed', error: err.message });
  }
};

exports.getAllMealsTime = async (req, res) => {
  try {
    const docs = await MealsTime.find().sort('-createdAt');
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: 'Get all mealsTime failed', error: err.message });
  }
};

exports.createDateMeals = async (req, res) => {
  try {
    const { dateID, listMealsTime } = req.body;

    const dateRe = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    if (!dateID || !dateRe.test(dateID)) {
      return res.status(400).json({ message: 'dateID must be YYYY-MM-DD' });
    }

    if (!Array.isArray(listMealsTime) || listMealsTime.length === 0) {
      return res.status(400).json({ message: 'listMealsTime must be a non-empty array of strings' });
    }

    const listMealsTimeClean = listMealsTime.map(String).map(s => s.trim()).filter(Boolean);
    if (listMealsTimeClean.length === 0) {
      return res.status(400).json({ message: 'listMealsTime has no usable values' });
    }

    const doc = await DateMeals.create({ dateID, listMealsTime: listMealsTimeClean });
    res.status(201).json(doc);
  } catch (err) {
    // Nếu bạn set unique index cho dateID, có thể trả 409 khi trùng ngày
    if (err.code === 11000) {
      return res.status(409).json({ message: 'dateID already exists' });
    }
    res.status(400).json({ message: 'Create dateMeals failed', error: err.message });
  }
};

exports.getAllDateMeals = async (req, res) => {
  try {
    const docs = await DateMeals.find().sort('-createdAt');
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: 'Get all dateMeals failed', error: err.message });
  }
};


exports.importMealPlan = async (req, res) => {
  try {
    const { schedule } = req.body; // chính là output của generatePlan

    if (!Array.isArray(schedule) || schedule.length === 0) {
      return res.status(400).json({ message: "schedule must be a non-empty array" });
    }

    // Lưu tất cả ngày
    for (const day of schedule) {
      // 1. Insert Meals trước
      const mealDocs = [];
      for (const meal of day.meals) {
        const doc = await Meals.create({
          nameMeals: meal.nameMeals,
          description: meal.description,
          totalCalor: meal.totalCalor,
        });
        mealDocs.push(doc._id.toString());
      }

      // 2. Insert MealsTime, mapping listMeals
      const mealsTimeDocs = [];
      for (const mt of day.mealsTime) {
        // đổi listMeals (IDs tạm) sang IDs thực từ mealDocs
        const listMealsIds = mt.listMeals.map((_, idx) => mealDocs[idx]);
        const doc = await MealsTime.create({
          typeTime: mt.typeTime,
          time: mt.time,
          listMeals: listMealsIds,
        });
        mealsTimeDocs.push(doc._id.toString());
      }

      // 3. Insert DateMeals
      await DateMeals.create({
        dateID: day.dateID,
        listMealsTime: mealsTimeDocs,
      });
    }

    res.status(201).json({ message: "Meal plan imported successfully" });
  } catch (err) {
    res.status(500).json({ message: "Import meal plan failed", error: err.message });
  }
};
