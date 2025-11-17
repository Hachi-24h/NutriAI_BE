require("dotenv").config();

const isDocker = process.env.IS_DOCKER === "true";

const config = {
  IS_DOCKER: isDocker,

  USER_SERVICE_URL: isDocker
    ? process.env.USER_SERVICE_URL_DOCKER
    : process.env.USER_SERVICE_URL_LOCAL,

  MEAL_SERVICE_URL: isDocker
    ? process.env.MEAL_SERVICE_URL_DOCKER
    : process.env.MEAL_SERVICE_URL_LOCAL,

  SCHEDULE_SERVICE_URL: isDocker
    ? process.env.SCHEDULE_SERVICE_URL_DOCKER
    : process.env.SCHEDULE_SERVICE_URL_LOCAL,

  SCHEDULE_RESULT_SERVICE_URL: isDocker
    ? process.env.SCHEDULE_RESULT_SERVICE_URL_DOCKER
    : process.env.SCHEDULE_RESULT_SERVICE_URL_LOCAL,

  AUTH_SERVICE_URL: isDocker
    ? process.env.AUTH_SERVICE_URL_DOCKER
    : process.env.AUTH_SERVICE_URL_LOCAL,

  ADMIN_SERVICE_URL: isDocker
    ? process.env.ADMIN_SERVICE_URL_DOCKER
    : process.env.ADMIN_SERVICE_URL_LOCAL,
};

module.exports = config;