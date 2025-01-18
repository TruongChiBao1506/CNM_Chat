const NotFoundError = require("../exception/NotFoundError");
const User = require("../models/User");
const Friend = require("../models/Friend");
const FriendRequest = require("../models/FriendRequest");
const Conversation = require("../models/Conversation");
const commonUtils = require("../utils/commonUtils");
const ObjectId = require("mongoose").Types.ObjectId;

const FRIEND_STATUS = ["FRIEND", "FOLLOWER", "YOU_FOLLOW", "NOT_FRIEND"];

class UserService {
  // lấy thông tin cơ bản của user:
  async getUserSummaryInfo(username) {
    const user = await User.findOne(
      { username },
      "-_id username name avatar isActived"
    );

    if (!user) throw new NotFoundError("User");

    return user;
  }

  /**
   * lấy trạng thái bạn bè
   * @param {*} _id: id của user hiện tại
   * @param {*} searchUsername : username của user cần tìm
   * @returns : thông tin user cần tìm và trạng thái bạn bè
   */
  async getStatusFriendOfUser(_id, searchUsername) {
    await User.checkById(_id);

    // Lấy thông tin user cần tìm
    const searchUserResult = await User.findByUsername(searchUsername);
    const searchUserId = searchUserResult._id;

    // Thêm thông tin về mối quan hệ
    searchUserResult.status = await this.getFriendStatus(_id, searchUserId);

    // Số nhóm chung
    searchUserResult.numberCommonGroup = await this.getNumberCommonGroup(
      _id,
      searchUserId
    );

    // Số bạn chung
    searchUserResult.numberCommonFriend = await this.getNumberCommonFriend(
      _id,
      searchUserId
    );

    return searchUserResult;
  }

  /**
   * lấy trạng thái bạn bè theo id
   * @param {*} _id : id của user hiện tại
   * @param {*} searchUserId : id của user cần tìm
   * @returns : thông tin user cần tìm và trạng thái bạn bè
   */
  async getStatusFriendOfUserById(_id, searchUserId) {
    await User.checkById(_id);
    const searchUserResult = await User.getById(searchUserId);

    searchUserResult.status = await this.getFriendStatus(_id, searchUserId);
    searchUserResult.numberCommonGroup = await this.getNumberCommonGroup(
      _id,
      searchUserId
    );
    searchUserResult.numberCommonFriend = await this.getNumberCommonFriend(
      _id,
      searchUserId
    );

    return searchUserResult;
  }

  /**
   * Đếm số nhóm chung
   * @param {*} myId : id của user hiện tại
   * @param {*} searchUserId : id của user cần tìm
   * @returns : số nhóm chung
   */
  async getNumberCommonGroup(myId, searchUserId) {
    // Đếm số conversation có type=true (nhóm) mà cả 2 user đều là thành viên
    return await Conversation.countDocuments({
      type: true,
      members: { $all: [myId, searchUserId] },
    });
  }

  /**
   * Đếm số bạn chung
   * @param {*} myId : id của user hiện tại
   * @param {*} searchUserId : id của user cần tìm
   * @returns : số lượng bạn chung giữa 2 user
   */
  async getNumberCommonFriend(myId, searchUserId) {
    //Tìm tất cả các document có chứa searchUserId
    let friendIdsOfSearchUser = await Friend.aggregate([
      { $match: { userIds: { $in: [ObjectId(searchUserId)] } } },
      {
        $project: { _id: 0, userIds: 1 },
      },
      {
        $unwind: "$userIds",
      },
      {
        $match: { userIds: { $ne: ObjectId(searchUserId) } }, // loại bỏ chính searchUserId
      },
    ]);
    friendIdsOfSearchUser = friendIdsOfSearchUser.map(
      (friendIdEle) => friendIdEle.userIds
    );
    friendIdsOfSearchUser = friendIdsOfSearchUser.filter(
      (friendIdEle) => friendIdEle + "" != myId // loại bỏ myId
    );

    const commonFriends = await Friend.find({
      $and: [
        // Điều kiện 1: Là bạn với một trong những người trong danh sách bạn bè của searchUser
        { userIds: { $in: [...friendIdsOfSearchUser] } },

        // Điều kiện 2: Và cũng là bạn với user hiện tại (myId)
        { userIds: { $in: [myId] } },
      ],
    });

    return commonFriends.length;
  }

  /**
   * Kiểm tra trạng thái bạn bè
   * @param {*} myId : id của user hiện tại
   * @param {*} searchUserId : id của user cần tìm
   * @returns : trạng thái bạn bè
   */
  async getFriendStatus(myId, searchUserId) {
    let status = FRIEND_STATUS[3]; // NOT_FRIEND

    // check xem có bạn bè không
    if (await Friend.existsByIds(myId, searchUserId)) status = FRIEND_STATUS[0];
    // check đối phương  gởi lời mời
    else if (await FriendRequest.existsByIds(searchUserId, myId))
      status = FRIEND_STATUS[1];
    // check mình gởi lời mời
    else if (await FriendRequest.existsByIds(myId, searchUserId))
      status = FRIEND_STATUS[2];

    return status;
  }

  /**
   * Lấy danh sách bạn bè
   * @param {*} username : username của user hiện tại
   * @param {*} page : trang hiện tại
   * @param {*} size : số lượng user trên một trang
   * @returns : danh sách bạn bè
   */
  async getList(username, page, size) {
    const { skip, limit, totalPages } = commonUtils.getPagination(
      page,
      size,
      await User.countDocuments({
        username: { $regex: ".*" + username + ".*" },
      })
    );

    const users = await User.find(
      {
        username: { $regex: ".*" + username + ".*" },
      },
      "name username gender isActived isDeleted isAdmin"
    )
      .skip(skip)
      .limit(limit);

    return {
      data: users,
      page,
      size,
      totalPages,
    };
  }

  // Cập nhật trạng thái active
  async updateActived(userId, status) {
    const { nModified } = await User.updateOne(
      { _id: userId },
      { isDeleted: status }
    );

    if (nModified === 0) throw new NotFoundError("User");
  }
}

module.exports = new UserService();
