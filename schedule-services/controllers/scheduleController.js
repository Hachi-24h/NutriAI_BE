
import { cuarnos } from "../utils/cuarnos.js";
// Thêm schedule




export const generateSchedule = async (req, res) => {
  try {
    const { info } = req.body; // client gửi yêu cầu
    const result = await cuarnos(info);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Không tạo được lịch ăn uống" });
  }
};