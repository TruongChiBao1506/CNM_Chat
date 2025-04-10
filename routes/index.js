const authRouter = require("./auth");
const commonInfoRouter = require("./commonInfo");

const auth = require("../middleware/auth");

const route = (app) => {
  const meRouter = require("./me")();

  app.use("/auth", authRouter);
  app.use("/me", auth, meRouter);
  app.use("/common", commonInfoRouter);
  
};

module.exports = route;
