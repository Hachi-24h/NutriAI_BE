const axios = require("axios");

module.exports = function requestLogger(serviceName) {
  return (req, res, next) => {
    res.on("finish", async () => {
      try {
        // Lấy URL theo môi trường
        let adminUrl =
          process.env.IS_DOCKER === "true"
            ? process.env.ADMIN_SERVICE_URL_DOCKER
            : process.env.ADMIN_SERVICE_URL_LOCAL;

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
