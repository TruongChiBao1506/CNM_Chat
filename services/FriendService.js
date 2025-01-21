const User = require("../models/User");
const Friend = require("../models/Friend");
const FriendRequest = require("../models/FriendRequest");
const Conversation = require("../models/Conversation");
const MyError = require("../exception/MyError");
const ObjectId = require("mongoose").Types.ObjectId;
const conversationService = require("./ConversationService");
const userService = require("./UserService");

class FriendService {
  /**
   *
   * @param {*} name : Tên bạn bè cần tìm
   * @param {*} _id : Id người dùng
   * @returns Lấy danh sách bạn bè của một người dùng, lọc theo tên.
   */
  async getList(name, _id) {
    await User.getById(_id);

    const friends = await Friend.aggregate([
      { $project: { _id: 0, userIds: 1 } },
      {
        $match: {
          userIds: { $in: [ObjectId(_id)] },
        },
      },
      { $unwind: "$userIds" },
      {
        $match: {
          userIds: { $ne: ObjectId(_id) },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userIds",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $replaceWith: "$user" },
      {
        $match: {
          name: { $regex: name, $options: "i" },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          username: 1,
          avatar: 1,
          avatarColor: 1,
        },
      },
    ]);

    return friends;
  }

  // transaction
  /**
   *
   * @param {*} _id : Id người dùng
   * @param {*} senderId : Id người gửi lời mời kết bạn
   * @returns Chấp nhận một lời mời kết bạn.
   */
  async acceptFriend(_id, senderId) {
    // check có lời mời này không
    await FriendRequest.checkByIds(senderId, _id);

    // check đã là bạn bè
    if (await Friend.existsByIds(_id, senderId))
      throw new MyError("Friend exists");

    // xóa đi lời mời
    await FriendRequest.deleteOne({ senderId, receiverId: _id });

    // thêm bạn bè
    const friend = new Friend({ userIds: [_id, senderId] });
    await friend.save();

    return await conversationService.createIndividualConversationWhenWasFriend(
      _id,
      senderId
    );
  }

  async deleteFriend(_id, userId) {
    // xóa bạn bè
    await Friend.deleteByIds(_id, userId);
  }

  /**
   *
   * @param {*} _id : Id người dùng
   * @returns : Lấy danh sách lời mời kết bạn đã nhận.
   */
  async getListInvites(_id) {
    const users = await FriendRequest.aggregate([
      { $match: { receiverId: ObjectId(_id) } },
      { $project: { _id: 0, senderId: 1 } },
      {
        $lookup: {
          from: "users",
          localField: "senderId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $replaceWith: "$user" },
      {
        $project: {
          _id: 1,
          name: 1,
          username: 1,
          avatar: 1,
          avatarColor: 1,
        },
      },
    ]);

    const usersResult = [];

    for (const userEle of users) {
      const userTempt = {
        ...userEle,
        numberCommonGroup: await userService.getNumberCommonGroup(
          _id,
          userEle._id
        ),
        numberCommonFriend: await userService.getNumberCommonFriend(
          _id,
          userEle._id
        ),
      };

      usersResult.push(userTempt);
    }

    return usersResult;
  }

  async deleteFriendInvite(_id, senderId) {
    await FriendRequest.deleteByIds(senderId, _id);
  }

  async getListInvitesWasSend(_id) {
    // check tồn tại
    await User.checkById(_id);

    const users = await FriendRequest.aggregate([
      { $match: { senderId: ObjectId(_id) } },
      { $project: { _id: 0, receiverId: 1 } },
      {
        $lookup: {
          from: "users",
          localField: "receiverId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $replaceWith: "$user" },
      {
        $project: {
          _id: 1,
          name: 1,
          username: 1,
          avatar: 1,
          avatarColor: 1,
        },
      },
    ]);

    const usersResult = [];

    for (const userEle of users) {
      const userTempt = {
        ...userEle,
        numberCommonGroup: await userService.getNumberCommonGroup(
          _id,
          userEle._id
        ),
        numberCommonFriend: await userService.getNumberCommonFriend(
          _id,
          userEle._id
        ),
      };

      usersResult.push(userTempt);
    }

    return usersResult;
  }

  async sendFriendInvite(_id, userId) {
    await User.checkById(_id);
    await User.checkById(userId);

    // check có bạn bè hay chưa
    if (await Friend.existsByIds(_id, userId))
      throw new MyError("Friend exists");

    // check không có lời mời nào
    if (
      (await FriendRequest.existsByIds(_id, userId)) ||
      (await FriendRequest.existsByIds(userId, _id))
    )
      throw new MyError("Invite exists");

    const friendRequest = new FriendRequest({
      senderId: _id,
      receiverId: userId,
    });

    await friendRequest.save();
  }

  async deleteInviteWasSend(_id, userId) {
    await FriendRequest.deleteByIds(_id, userId);
  }

  async getSuggestFriends(_id, page, size) {
    if (!size || page < 0 || size <= 0)
      throw new MyError("Params suggest friend invalid");

    let friendIds = await Friend.aggregate([
      { $match: { userIds: { $in: [ObjectId(_id)] } } },
      { $unwind: "$userIds" },
      { $match: { userIds: { $ne: ObjectId(_id) } } },
    ]);
    friendIds = friendIds.map((ele) => ele.userIds);

    const friendObjectIds = friendIds.map((ele) => ObjectId(ele));
    const conversations = await Conversation.aggregate([
      { $match: { type: true, members: { $in: [ObjectId(_id)] } } },
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
        $match: {
          members: { $ne: ObjectId(_id), $nin: friendObjectIds },
        },
      },
      {
        $group: {
          _id: "$members",
        },
      },
    ]);

    const result = [];

    for (const converEle of conversations) {
      try {
        const userTempt = await userService.getStatusFriendOfUserById(
          _id,
          converEle._id
        );

        result.push({
          ...userTempt,
          total: userTempt.numberCommonGroup + userTempt.numberCommonFriend,
        });
      } catch (err) {}
    }

    const sortResult = result.sort((first, next) => {
      if (first.total >= next.total) return -1;
      return 1;
    });

    const start = page * size;
    const end = start + size;
    return sortResult.slice(start, end);
  }
}

module.exports = new FriendService();
const User = require("../models/User");
const Friend = require("../models/Friend");
const FriendRequest = require("../models/FriendRequest");
const Conversation = require("../models/Conversation");
const MyError = require("../exception/MyError");
const ObjectId = require("mongoose").Types.ObjectId;
const conversationService = require("./ConversationService");
const userService = require("./UserSevice");

class FriendService {
  async getList(name, _id) {
    await User.getById(_id);

    const friends = await Friend.aggregate([
      { $project: { _id: 0, userIds: 1 } },
      {
        $match: {
          userIds: { $in: [ObjectId(_id)] },
        },
      },
      { $unwind: "$userIds" },
      {
        $match: {
          userIds: { $ne: ObjectId(_id) },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userIds",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $replaceWith: "$user" },
      {
        $match: {
          name: { $regex: name, $options: "i" },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          username: 1,
          avatar: 1,
          avatarColor: 1,
        },
      },
    ]);

    return friends;
  }

  // transaction
  async acceptFriend(_id, senderId) {
    // check có lời mời này không
    await FriendRequest.checkByIds(senderId, _id);

    // check đã là bạn bè
    if (await Friend.existsByIds(_id, senderId))
      throw new MyError("Friend exists");

    // xóa đi lời mời
    await FriendRequest.deleteOne({ senderId, receiverId: _id });

    // thêm bạn bè
    const friend = new Friend({ userIds: [_id, senderId] });
    await friend.save();

    return await conversationService.createIndividualConversationWhenWasFriend(
      _id,
      senderId
    );
  }

  async deleteFriend(_id, userId) {
    // xóa bạn bè
    await Friend.deleteByIds(_id, userId);
  }

  async getListInvites(_id) {
    const users = await FriendRequest.aggregate([
      { $match: { receiverId: ObjectId(_id) } },
      { $project: { _id: 0, senderId: 1 } },
      {
        $lookup: {
          from: "users",
          localField: "senderId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $replaceWith: "$user" },
      {
        $project: {
          _id: 1,
          name: 1,
          username: 1,
          avatar: 1,
          avatarColor: 1,
        },
      },
    ]);

    const usersResult = [];

    for (const userEle of users) {
      const userTempt = {
        ...userEle,
        numberCommonGroup: await userService.getNumberCommonGroup(
          _id,
          userEle._id
        ),
        numberCommonFriend: await userService.getNumberCommonFriend(
          _id,
          userEle._id
        ),
      };

      usersResult.push(userTempt);
    }

    return usersResult;
  }

  async deleteFriendInvite(_id, senderId) {
    await FriendRequest.deleteByIds(senderId, _id);
  }

  /**
   *
   * @param {*} _id : Id người dùng
   * @returns : Lấy danh sách lời mời kết bạn đã gửi.
   */
  async getListInvitesWasSend(_id) {
    // check tồn tại
    await User.checkById(_id);

    const users = await FriendRequest.aggregate([
      { $match: { senderId: ObjectId(_id) } },
      { $project: { _id: 0, receiverId: 1 } },
      {
        $lookup: {
          from: "users",
          localField: "receiverId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $replaceWith: "$user" },
      {
        $project: {
          _id: 1,
          name: 1,
          username: 1,
          avatar: 1,
          avatarColor: 1,
        },
      },
    ]);

    const usersResult = [];

    for (const userEle of users) {
      const userTempt = {
        ...userEle,
        numberCommonGroup: await userService.getNumberCommonGroup(
          _id,
          userEle._id
        ),
        numberCommonFriend: await userService.getNumberCommonFriend(
          _id,
          userEle._id
        ),
      };

      usersResult.push(userTempt);
    }

    return usersResult;
  }

  /**
   * Gửi một lời mời kết bạn.
   * @param {*} _id : Id người gửi lời mời
   * @param {*} userId : Id người nhận lời mời
   */
  async sendFriendInvite(_id, userId) {
    await User.checkById(_id);
    await User.checkById(userId);

    // check có bạn bè hay chưa
    if (await Friend.existsByIds(_id, userId))
      throw new MyError("Friend exists");

    // check không có lời mời nào
    if (
      (await FriendRequest.existsByIds(_id, userId)) ||
      (await FriendRequest.existsByIds(userId, _id))
    )
      throw new MyError("Invite exists");

    // tạo lời mời
    const friendRequest = new FriendRequest({
      senderId: _id,
      receiverId: userId,
    });

    await friendRequest.save();
  }

  async deleteInviteWasSend(_id, userId) {
    await FriendRequest.deleteByIds(_id, userId);
  }

  /**
   * 1. Tìm danh sách bạn bè hiện tại (friendIds).
   * 2. Tìm các thành viên trong các nhóm chung, loại trừ bản thân và bạn bè hiện tại.
   * 3. Với mỗi người, tính tổng số nhóm chung và số bạn chung
   * 4. Sắp xếp danh sách đề xuất theo total giảm dần
   *
   * @param {*} _id : Id người dùng
   * @param {*} page : Số trang
   * @param {*} size : Số lượng bản ghi mỗi trang
   * @returns : Lấy danh sách bạn bè gợi ý cho Người dùng.
   */
  async getSuggestFriends(_id, page, size) {
    if (!size || page < 0 || size <= 0)
      throw new MyError("Params suggest friend invalid");

    let friendIds = await Friend.aggregate([
      { $match: { userIds: { $in: [ObjectId(_id)] } } }, // tìm bạn bè của người dùng
      { $unwind: "$userIds" },
      { $match: { userIds: { $ne: ObjectId(_id) } } }, // loại trừ bản thân
    ]);
    friendIds = friendIds.map((ele) => ele.userIds); // lấy ra danh sách id bạn bè

    const friendObjectIds = friendIds.map((ele) => ObjectId(ele)); // chuyển danh sách id bạn bè sang ObjectId

    // Tìm các thành viên trong nhóm chung mà không phải là bạn bè hiện tại hoặc chính người dùng.
    const conversations = await Conversation.aggregate([
      { $match: { type: true, members: { $in: [ObjectId(_id)] } } }, // tìm các nhóm chung của người dùng
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
        $match: {
          members: { $ne: ObjectId(_id), $nin: friendObjectIds }, // loại trừ bản thân và bạn bè
        },
      },
      {
        $group: {
          _id: "$members", // Gom nhóm theo từng thành viên (loại bỏ trùng lặp)
        },
      },
    ]);

    const result = [];

    for (const converEle of conversations) {
      try {
        const userTempt = await userService.getStatusFriendOfUserById(
          _id,
          converEle._id
        );

        result.push({
          ...userTempt,
          total: userTempt.numberCommonGroup + userTempt.numberCommonFriend, // Tổng số nhóm chung và bạn bè chung
        });
      } catch (err) {}
    }

    const sortResult = result.sort((first, next) => {
      if (first.total >= next.total) return -1;
      return 1;
    });

    const start = page * size;
    const end = start + size;
    return sortResult.slice(start, end);
  }
}

module.exports = new FriendService();
