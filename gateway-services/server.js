const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");
require("dotenv").config({ path: "../.env" });

const app = express();
app.use(cors());

// LOG REQUEST
app.use((req, res, next) => {
  // console.log(`➡️ ${req.method} ${req.originalUrl}`);
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
setupService("/auth", process.env.AUTH_SERVICE_URL);
setupService("/user", process.env.USER_SERVICE_URL);
setupService("/schedule", process.env.SCHEDULE_SERVICE_URL);
setupService("/meal", process.env.MEAL_SERVICE_URL);
setupService("/chatbot", process.env.CHATBOT_SERVICE_URL);
setupService("/admin", process.env.ADMIN_SERVICE_URL);
setupService("/mealscan", process.env.MEAL_SCAN_SERVICE_URL);
setupService("/scanai", process.env.SCANAI_URL);

const PORT = process.env.GATEWAY_PORT;
app.listen(PORT, () =>
  console.log(`🚀 Gateway running on ${PORT}`)
);
