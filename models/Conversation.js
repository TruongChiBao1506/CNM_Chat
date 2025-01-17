const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const NotFoundError = require("../exception/NotFoundError");

const conversationSchema = new Schema(
  {
    name: String,
    avatar: String,
    leaderId: ObjectId,
    managerIds: {
      type: [ObjectId],
      default: [],
    },
    lastMessageId: ObjectId, // ID tin nhắn cuối cùng
    pinMessageIds: {
      // Danh sách ID tin nhắn được ghim
      type: [ObjectId],
      default: [],
    },
    members: [ObjectId],
    isJoinFromLink: {
      // Cho phép tham gia qua link hay không
      type: Boolean,
      default: true,
    },
    type: Boolean, // true: nhóm, false: chat 1-1
  },
  { timestamps: true }
);

// Tạo index cho tìm kiếm theo tên
conversationSchema.index({ name: "text" });

// Lấy danh sách conversation của user
conversationSchema.statics.getListByUserId = async (userId) => {
  return await Conversation.find({
    members: { $in: [userId] },
  }).sort({ updatedAt: -1 });
};

// Tìm nhóm chat theo tên
conversationSchema.statics.getListGroupByNameContainAndUserId = async (
  name,
  userId
) => {
  return await Conversation.find({
    name: { $regex: name, $options: "i" }, // Tìm tên không phân biệt hoa thường
    members: { $in: [userId] },
    type: true, // Nhóm chat
  }).sort({ updatedAt: -1 });
};

// Tìm chat 1-1 theo tên
conversationSchema.statics.getListIndividualByNameContainAndUserId = async (
  name,
  userId
) => {
  return await Conversation.aggregate([
    {
      $match: {
        members: { $in: [ObjectId(userId)] },
        type: false,
      },
    },
    {
      $lookup: {
        from: "members",
        localField: "_id",
        foreignField: "conversationId",
        as: "users",
      },
    },
    {
      $unwind: "$users",
    },
    // Lọc theo tên người chat cùng
    {
      $match: {
        "users.userId": { $ne: ObjectId(userId) },
        "users.name": { $regex: name, $options: "i" },
      },
    },
    {
      $sort: { updatedAt: -1 },
    },
    {
      $project: { _id: 1 },
    },
  ]);
};

// Lấy tên và avatar của tất cả thành viên
conversationSchema.statics.getListNameAndAvatarOfMembersById = async (_id) => {
  return await Conversation.aggregate([
    {
      $match: {
        _id: ObjectId(_id),
      },
    },

    {
      $project: {
        _id: 0,
        members: 1,
      },
    },
    {
      $unwind: "$members",
    },
    {
      $lookup: {
        from: "users",
        localField: "members",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    {
      $project: {
        name: "$user.name",
        avatar: "$user.avatar",
        avatarColor: "$user.avatarColor",
      },
    },
  ]);
};

// Kiểm tra tồn tại chat 1-1 giữa 2 user
conversationSchema.statics.existsIndividualConversation = async (
  userId1,
  userId2
) => {
  const conversation = await Conversation.findOne({
    type: false,
    members: { $all: [userId1, userId2] },
  });

  if (conversation) return conversation._id;
  return null;
};

conversationSchema.statics.getByIdAndUserId = async (
  _id,
  userId,
  message = "Conversation"
) => {
  const conversation = await Conversation.findOne({
    _id,
    members: { $in: [userId] },
  });

  if (!conversation) throw new NotFoundError(message);

  return conversation;
};

conversationSchema.statics.getById = async (_id, message = "Conversation") => {
  const conversation = await Conversation.findById(_id);
  if (!conversation) throw new NotFoundError(message);

  return conversation;
};

conversationSchema.statics.existsByUserIds = async (
  _id,
  userIds,
  message = "Conversation"
) => {
  const conversation = await Conversation.findOne({
    _id,
    members: { $all: [...userIds] },
  });

  if (!conversation) throw new NotFoundError(message);

  return conversation;
};

const Conversation = mongoose.model("conversation", conversationSchema);

module.exports = Conversation;
