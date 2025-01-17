const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const NotFoundError = require("../exception/NotFoundError");

/**
 * Đại diện cho mối quan hệ bạn bè giữa hai người dùng.
 */
const friendSchema = new Schema({
  userIds: [ObjectId],
});

// Kiểm tra xem đã tồn tại mối quan hệ bạn bè giữa 2 user chưa
friendSchema.statics.existsByIds = async (userId1, userId2) => {
  const isExists = await Friend.findOne({
    userIds: { $all: [userId1, userId2] },
  });

  if (isExists) return true;

  return false;
};

// Kiểm tra và throw error nếu không tìm thấy mối quan hệ bạn bè
friendSchema.statics.checkByIds = async (
  userId1,
  userId2,
  message = "Friend"
) => {
  const isExists = await Friend.findOne({
    userIds: { $all: [userId1, userId2] },
  });

  if (!isExists) throw new NotFoundError(message);
};

friendSchema.statics.deleteByIds = async (
  userId1,
  userId2,
  message = "Friend"
) => {
  const queryResult = await Friend.deleteOne({
    userIds: { $all: [userId1, userId2] },
  });

  const { deletedCount } = queryResult;
  if (deletedCount === 0) throw new NotFoundError(message);
};

const Friend = mongoose.model("friend", friendSchema);

module.exports = Friend;
