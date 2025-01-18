const authRouter = require("./auth");

const route = (app) => {
  app.use("/auth", authRouter);
};

module.exports = route;
