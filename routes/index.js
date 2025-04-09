const authRouter = require("./auth");
const userRouter = require('./user');
const classifyRouter = require('./classify');
const auth = require("../middleware/auth");
const stickerRouter = require('./sticker');

const route = (app,io) => {
  const meRouter = require("./me")(io);
  const conversationRouter = require('./conversation')(io);
  const friendRouter = require('./friend')(io);
  const channelRouter = require('./channel')(io);
  const messageRouter = require('./message')(io);
  const pinMessageRouter = require('./pinMessage')(io);
  const voteRouter = require('./vote')(io);
  app.use("/users", auth, userRouter);
  app.use("/auth", authRouter);
  app.use("/me", auth ,meRouter);
  app.use('/friends', auth, friendRouter);
  app.use('/classifies', auth, classifyRouter);
  app.use('/conversations', auth, conversationRouter);
  app.use('/channels', auth, channelRouter);
  app.use('/messages', auth, messageRouter);
  app.use('/pin-messages', auth, pinMessageRouter);
  app.use('/votes', auth, voteRouter);
  app.use('/stickers', auth, stickerRouter);
};

module.exports = route;
