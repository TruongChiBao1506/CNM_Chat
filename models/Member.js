const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const NotFoundError = require("../exception/NotFoundError");

const memberSchema = new Schema({
  conversationId: ObjectId,
  userId: ObjectId,
  lastView: {
    // Thời điểm cuối cùng người dùng xem cuộc hội thoại
    type: Date,
    default: new Date(),
  },
  name: String, // Biệt danh trong nhóm
  lastViewOfChannels: [{ channelId: ObjectId, lastView: Date }], // Thời điểm xem cuối cùng của từng kênh
  isNotify: {
    type: Boolean,
    default: true,
  },
});

// Lấy thông tin member theo conversationId và userId
memberSchema.statics.getByConversationIdAndUserId = async (
  conversationId,
  userId,
  message = "Conversation"
) => {
  const member = await Member.findOne({
    conversationId,
    userId,
  });

  if (!member) throw new NotFoundError(message);

  return member;
};

// Kiểm tra sự tồn tại của member trong conversation
memberSchema.statics.existsByConversationIdAndUserId = async (
  conversationId,
  userId
) => {
  const member = await Member.findOne({
    conversationId,
    userId,
  });

  if (!member) return false;

  return true;
};

// Lấy danh sách thông tin của tất cả members trong một conversation
memberSchema.statics.getListInfosByConversationId = async (conversationId) => {
  const users = await Member.aggregate([
    { $match: { conversationId: ObjectId(conversationId) } },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    {
      $project: {
        _id: 0,
        user: {
          _id: 1,
          name: 1,
          username: 1,
          avatar: 1,
          avatarColor: 1,
        },
      },
    },
    {
      $replaceWith: "$user",
    },
  ]);

  return users;
};

const Member = mongoose.model("member", memberSchema);

module.exports = Member;
