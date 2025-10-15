// server.js
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import mealRoutes from "./routes/mealRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Gắn routes
app.use("/", mealRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 AI MealPlan service running on http://localhost:${PORT}`);
});

// BƯỚC 1: XÁC ĐỊNH YÊU CẦU ĐẦU VÀO
// - mục tiêu bạn là gì 
// - thời gian bạn muốn đạt được mục tiêu

// BƯỚC 2 : THÔNG TIN CÁ NHÂN
// - chiều cao, cân nặng, tuổi, giới tính
// - mức độ hoạt động (ít, nhẹ, vừa, cao, rất cao)
// - các bệnh lý (nếu có)

// BƯỚC 3: THÔNG TIN ĂN UỐNG
// - dị ứng thực phẩm (nếu có)
// - sở thích ăn uống (nếu có)
// - số bữa ăn trong ngày (1-3 bữa)
// - giờ ăn cụ thể (nếu có)
// - ngân sách yêu cầu (nếu có)

// BUỚC 4: YÊU CẦU VỀ THỰC ĐƠN
// - loại hình thức ( tự nấu, ăn ngoài, kết hợp )
// - số ngày muốn lên kế hoạch mẫu ( 2-5 ngày)
// - ghi chú thêm (nếu có)

