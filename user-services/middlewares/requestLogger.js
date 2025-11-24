const axios = require("axios");

module.exports = function requestLogger(serviceName) {
  return (req, res, next) => {
    res.on("finish", async () => {
      try {
        // Lấy URL theo môi trường
        let adminUrl = process.env.ADMIN_SERVICE_URL;

        // Nối route increment
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
