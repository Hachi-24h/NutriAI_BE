import axios from "axios";

export default function requestLogger(serviceName) {
  return (req, res, next) => {
    res.on("finish", async () => {
      try {
        // Chọn URL admin-service dựa trên môi trường
        let adminUrl =
          process.env.IS_DOCKER === "true"
            ? process.env.ADMIN_SERVICE_URL_DOCKER
            : process.env.ADMIN_SERVICE_URL_LOCAL;

        adminUrl = adminUrl + "/increment";

        // Gửi dữ liệu sang admin-service
        await axios.post(adminUrl, {
          service: serviceName,
          api: req.originalUrl.split("?")[0], // chỉ lấy path
        });
      } catch (err) {
        console.error(`[${serviceName}] ❌ Không gửi log được:`, err.message);
      }
    });

    next();
  };
}
