const axios = require("axios");

module.exports = function requestLogger(serviceName) {
  return (req, res, next) => {
    res.on("finish", async () => {
      try {
        const adminUrl =
          process.env.ADMIN_LOG_URL || "http://localhost:5010/admin-log/increment";
         
        // Gửi dữ liệu sang admin-service
        const res = await axios.post(adminUrl, {
          service: serviceName,
          api: req.originalUrl.split("?")[0] // chỉ lấy path, bỏ query string
        });
        // console.log(`[ -- ${serviceName} --] ✅ Gửi log thành công:`);
      } catch (err) {
        console.error(`[${serviceName}] ❌ Không gửi log được:`, err.message);
      }
    });

    next();
  };
};
