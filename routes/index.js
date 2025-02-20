const authRouter = require("./auth");

const auth = require("../middleware/auth");

const route = (app) => {
  const meRouter = require("./me");

  app.use("/auth", authRouter);
  app.use("/me", auth, meRouter);
};

module.exports = route;
