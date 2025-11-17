const axios = require("axios");

module.exports = function requestLogger(serviceName) {
  return (req, res, next) => {
    res.on("finish", async () => {
      try {
        // Lấy URL đúng
        let adminUrl =
          process.env.IS_DOCKER === "true"
            ? process.env.ADMIN_SERVICE_BASE_URL_DOCKER
            : process.env.ADMIN_SERVICE_BASE_URL_LOCAL;

        // Thêm /increment
        adminUrl = adminUrl + "/increment";
        await axios.post(adminUrl, {
          service: serviceName,
          api: req.originalUrl.split("?")[0],
        });

      } catch (err) {
        console.error(`[${serviceName}] ❌ Không gửi log được:`, err.message);
      }
    });

    next();
  };
};
