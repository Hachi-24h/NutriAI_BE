const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");
require("dotenv").config();

const app = express();
app.use(cors());

// LOG REQUEST
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  next();
});

// SETUP SERVICE
const setupService = (prefix, target) => {
  app.use(
    prefix,
    createProxyMiddleware({
      target,
      changeOrigin: true,

      // ✨ Rewrite path: mọi thứ sau prefix đều trở thành /auth/xxxx đúng chuẩn
      pathRewrite: (path, req) => {
        // VD: /auth/auth/login -> /auth/login
        //     /auth/auth/auth/login -> /auth/login
        //     /auth/login -> /auth/login
        const cleaned = path.replace(new RegExp(`^${prefix}+`), prefix);

        // console.log(`🔄 Rewritten: ${path} -> ${cleaned}`);
        return cleaned;
      },

    })
  );
};



// MAP SERVICES
setupService("/auth", process.env.AUTH_SERVICE);
setupService("/user", process.env.USER_SERVICE);
setupService("/friend", process.env.FRIEND_SERVICE);
setupService("/schedule", process.env.SCHEDULE_SERVICE);
setupService("/meal", process.env.MEAL_SERVICE);
setupService("/chatbot", process.env.CHATBOT_SERVICE);
setupService("/admin", process.env.ADMIN_SERVICE);
setupService("/mealscan", process.env.MEAL_SCAN_SERVICE);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Gateway running on ${PORT}`)
);
