const Conversation = require("../models/Conversation");
const Classify = require("../models/Classify");
const Member = require("../models/Member");
const Message = require("../models/Message");
const Channel = require("../models/Channel");
const ObjectId = require("mongoose").Types.ObjectId;
const dateUtils = require("../utils/dateUtils");
const MyError = require("../exception/MyError");
const User = require("../models/User");
const conversationValidate = require("../validate/conversationValidate");
const messageService = require("../services/MessageService");
// const awsS3Service = require("./AwsS3Service");
const userService = require("./UserService");
const messageValidate = require("../validate/messageValidate");

class ConversationService {
  // danh sách
  async getList(userId) {
    const conversations = await Conversation.getListByUserId(userId);

    const conversationIds = conversations.map(
      (conversationEle) => conversationEle._id
    );

    return await this.getListSummaryByIds(conversationIds, userId);
  }

  // type group
  // Lấy danh sách các nhóm (group) mà người dùng tham gia, lọc theo tên.
  async getListGroup(name, userId) {
    const conversations = await Conversation.getListGroupByNameContainAndUserId(
      name,
      userId
    );

    const conversationIds = conversations.map(
      (conversationEle) => conversationEle._id
    );

    // lấy thông tin tóm tắt của từng nhóm.
    return await this.getListSummaryByIds(conversationIds, userId);
  }

  /**
   *
   * @param {*} name : tên người dùng
   * @param {*} userId : id người dùng
   * @returns Lấy danh sách các cuộc trò chuyện cá nhân (individual) của người dùng, lọc theo tên.
   */
  async getListIndividual(name, userId) {
    const conversations =
      await Conversation.getListIndividualByNameContainAndUserId(name, userId);

    const conversationIds = conversations.map(
      (conversationEle) => conversationEle._id
    );

    return await this.getListSummaryByIds(conversationIds, userId);
  }

  /**
   *
   * @param {*} ids : danh sách id cuộc hội thoại
   * @param {*} userId : id người dùng
   * @returns Lấy thông tin tóm tắt của một danh sách cuộc hội thoại dựa trên danh sách ID.
   */
  async getListSummaryByIds(ids, userId) {
    const conversationsResult = [];
    for (const id of ids) {
      const conversation = await this.getSummaryByIdAndUserId(id, userId);
      conversationsResult.push(conversation);
    }

    return conversationsResult;
  }

  /**
   *
   * @param {*} classifyId : id phân loại
   * @param {*} userId : id người dùng
   * @returns Lấy danh sách các cuộc hội thoại thuộc một phân loại cụ thể của người dùng.
   */
  async getListFollowClassify(classifyId, userId) {
    // check user này có phân loại này không
    const classify = await Classify.getByIdAndUserId(classifyId, userId);
    const { conversationIds } = classify;

    return await this.getListSummaryByIds(conversationIds, userId);
  }

  // get thông tin tóm tắt của 1 cuộc hộp thoại.
  async getSummaryByIdAndUserId(_id, userId) {
    // check xem có nhóm này hay không
    const member = await Member.getByConversationIdAndUserId(_id, userId);
    const { lastView, isNotify } = member;

    const conversation = await Conversation.findById(_id);
    const {
      lastMessageId,
      type,
      members,
      leaderId,
      isJoinFromLink,
      managerIds,
    } = conversation;

    // Lấy tin nhắn cuối cùng (nếu có)
    const lastMessage = lastMessageId
      ? await messageService.getById(lastMessageId, type)
      : null;

    // Đếm số tin nhắn chưa đọc
    const numberUnread = await Message.countUnread(lastView, _id);

    let nameAndAvatarInfo;

    // group
    if (type) nameAndAvatarInfo = await this.getGroupConversation(conversation);
    else {
      // individual
      nameAndAvatarInfo = await this.getIndividualConversation(_id, userId);

      const { members } = conversation;
      const index = members.findIndex((ele) => ele + "" != userId);
      nameAndAvatarInfo.userId = members[index];
      nameAndAvatarInfo.friendStatus = await userService.getFriendStatus(
        userId,
        members[index]
      );
    }

    let lastMessageTempt = {};

    const numberOfDeletedMessages = await Message.countDocuments({
      conversationId: _id,
      deletedUserIds: { $nin: [userId] },
    });
    if (!lastMessage || numberOfDeletedMessages === 0) lastMessageTempt = null;
    else
      lastMessageTempt = {
        ...lastMessage,
        createdAt: dateUtils.toTime(lastMessage.createdAt),
      };

    return {
      _id,
      ...nameAndAvatarInfo,
      type,
      totalMembers: members.length,
      numberUnread,
      leaderId,
      managerIds,
      lastMessage: lastMessageTempt,
      isNotify,
      isJoinFromLink,
    };
  }

  /**
   *
   * @param {*} _id : id cuộc trò chuyện
   * @param {*} userId : id người dùng
   * @returns Lấy thông tin của người bạn trong một cuộc trò chuyện cá nhân.
   */
  async getIndividualConversation(_id, userId) {
    const datas = await Member.aggregate([
      {
        $match: {
          conversationId: ObjectId(_id),
          userId: { $ne: ObjectId(userId) },
        },
      },
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
          name: "$user.name",
          avatar: "$user.avatar",
          avatarColor: "$user.avatarColor",
        },
      },
    ]);

    return datas[0];
  }

  /**
   * 1. Nếu tên nhóm (name) hoặc avatar (avatar) không tồn tại:
        Lấy thông tin tên và avatar của từng thành viên nhóm.
     2. Kết hợp các thông tin này để tạo tên nhóm và avatar nhóm.
     3. Trả về thông tin nhóm.
   * @param {*} conversation : cuộc trò chuyện
   * @returns Lấy thông tin của nhóm (tên, avatar).
   */
  async getGroupConversation(conversation) {
    const { _id, name, avatar } = conversation;

    let groupName = "";
    let groupAvatar = [];
    if (!name || !avatar) {
      const nameAndAvataresOfGroup =
        await Conversation.getListNameAndAvatarOfMembersById(_id);

      for (const tempt of nameAndAvataresOfGroup) {
        const nameTempt = tempt.name;
        const { avatar, avatarColor } = tempt;

        groupName += `, ${nameTempt}`;
        groupAvatar.push({ avatar, avatarColor });
      }
    }

    const result = {
      name,
      avatar,
    };

    if (!name) result.name = groupName.slice(2);
    if (!avatar) result.avatar = groupAvatar;

    return result;
  }

  // trả id conversation
  /**
   *
   * @param {*} userId1 : id người dùng 1
   * @param {*} userId2 : id người dùng 2
   * @returns Tạo một cuộc trò chuyện cá nhân giữa hai người dùng.
   */
  async createIndividualConversation(userId1, userId2) {
    const { userName1, userName2, conversationId } =
      await conversationValidate.validateIndividualConversation(
        userId1,
        userId2
      );

    if (conversationId) return { _id: conversationId, isExists: true };

    // thêm cuộc trò chuyện
    const newConversation = new Conversation({
      members: [userId1, userId2],
      type: false,
    });
    const saveConversation = await newConversation.save();
    const { _id } = saveConversation;

    // tạo 2 member
    const member1 = new Member({
      conversationId: _id,
      userId: userId1,
      name: userName1,
    });

    const member2 = new Member({
      conversationId: _id,
      userId: userId2,
      name: userName2,
    });

    // save
    member1.save().then();
    member2.save().then();

    return { _id, isExists: false };
  }

  /**
   *
   * @param {*} userId1
   * @param {*} userId2
   * @returns Tạo cuộc trò chuyện cá nhân khi hai người vừa trở thành bạn bè.
   */
  async createIndividualConversationWhenWasFriend(userId1, userId2) {
    const { _id, isExists } = await this.createIndividualConversation(
      userId1,
      userId2
    );

    // tạo message
    const newMessage = {
      content: "Đã là bạn bè",
      type: "NOTIFY",
      conversationId: _id,
    };
    const saveMessage = await messageService.addText(newMessage, userId1);

    return { conversationId: _id, isExists, message: saveMessage };
  }

  // trả id conversation
  /**
   * Quy trình:
    1.	Xác thực danh sách thành viên:
      o	Kiểm tra userIds không rỗng và tất cả người dùng đều tồn tại.
    2.	Tạo nhóm trò chuyện:
      o	Tạo bản ghi mới trong Conversation với danh sách thành viên và thông tin nhóm.
    3.	Thêm thông báo "Đã tạo nhóm":
      o	Gửi tin nhắn "Đã tạo nhóm" vào cuộc trò chuyện.
    4.	Lưu thành viên:
      o	Thêm bản ghi Member cho tất cả thành viên.
    5.	Thêm thông báo "Đã thêm vào nhóm":
      o	Gửi tin nhắn thông báo về việc thêm thành viên.
      o	Cập nhật tin nhắn cuối cùng của cuộc trò chuyện:

   * @param {*} userIdSelf: id người tạo nhóm
   * @param {*} name : tên nhóm
   * @param {*} userIds : danh sách id thành viên
   * @returns Tạo một nhóm trò chuyện với danh sách thành viên.
   */
  async createGroupConversation(userIdSelf, name, userIds) {
    if (userIds.length <= 0) throw new MyError("userIds invalid");

    // kiểm tra user
    const userIdsTempt = [userIdSelf, ...userIds];
    await User.checkByIds(userIdsTempt);

    // thêm cuộc trò chuyện
    const newConversation = new Conversation({
      name,
      leaderId: userIdSelf,
      members: [userIdSelf, ...userIds],
      type: true,
    });
    const saveConversation = await newConversation.save();
    const { _id } = saveConversation;

    // tạo tin nhắn
    const newMessage = new Message({
      userId: userIdSelf,
      content: "Đã tạo nhóm",
      type: "NOTIFY",
      conversationId: _id,
    });

    await newMessage.save();

    // lưu danh sách user
    for (const userId of userIdsTempt) {
      const member = new Member({
        conversationId: _id,
        userId,
        lastViewOfChannels: [],
      });

      member.save().then();
    }

    const memberAddMessage = new Message({
      userId: userIdSelf,
      manipulatedUserIds: [...userIds],
      content: "Đã thêm vào nhóm",
      type: "NOTIFY",
      conversationId: _id,
    });

    memberAddMessage.save().then((message) => {
      Conversation.updateOne({ _id }, { lastMessageId: message._id }).then();
    });

    return _id;
  }

  /**
   *
   * @param {*} _id : id cuộc trò chuyện
   * @param {*} name : tên nhóm
   * @param {*} userId : id người dùng
   * @returns Đổi tên nhóm hoặc cập nhật tên người bạn trong cuộc trò chuyện cá nhân.
   */
  async rename(_id, name, userId) {
    const conversation = await Conversation.getByIdAndUserId(_id, userId);
    const { type } = conversation;

    // group
    if (type) {
      // thêm tin nhắn đổi tên
      const newMessage = new Message({
        userId,
        content: `Đã đổi tên nhóm thành <b>"${name}"</b> `,
        type: "NOTIFY",
        conversationId: _id,
      });
      const saveMessage = await newMessage.save();
      // cập nhật tin nhắn mới nhất
      await Conversation.updateOne(
        { _id },
        { name, lastMessageId: saveMessage._id }
      );
      // cập nhật lastView thằng đổi
      await Member.updateOne(
        { conversationId: _id, userId },
        { lastView: saveMessage.createdAt }
      );

      return await messageService.getById(saveMessage._id, true);
    }

    // cá nhân
    const { members } = conversation;
    const otherUserId = members.filter((userIdEle) => userIdEle != userId);

    await Member.updateOne(
      { conversationId: _id, userId: otherUserId[0] },
      { name }
    );

    return;
  }

  // trả về link avatar
  // async updateAvatar(_id, file, userId) {
  //   const { mimetype } = file;
  //   if (mimetype !== "image/jpeg" && mimetype !== "image/png")
  //     throw new MyError("Image invalid");

  //   const conversation = await Conversation.getByIdAndUserId(_id, userId);
  //   const { type } = conversation;

  //   // chỉ thay đổi ảnh nhóm
  //   if (!type) throw new MyError("Upload file fail, only for group");

  //   const { avatar } = conversation;
  //   if (avatar) await awsS3Service.deleteFile(avatar);

  //   const avatarUrl = await awsS3Service.uploadFile(file);

  //   // thêm tin nhắn đổi tên
  //   const newMessage = new Message({
  //     userId,
  //     content: `Ảnh đại diện nhóm đã thay đổi`,
  //     type: "NOTIFY",
  //     conversationId: _id,
  //   });
  //   const saveMessage = await newMessage.save();
  //   // cập nhật conversation
  //   await Conversation.updateOne(
  //     { _id },
  //     { avatar: avatarUrl, lastMessageId: saveMessage._id }
  //   );
  //   // cập nhật lastView thằng đổi
  //   await Member.updateOne(
  //     { conversationId: _id, userId },
  //     { lastView: saveMessage.createdAt }
  //   );

  //   return {
  //     avatar: avatarUrl,
  //     lastMessage: await messageService.getById(saveMessage._id, true),
  //   };
  // }

  // trả về link avatar
  // async updateAvatarWithBase64(_id, fileInfo, userId) {
  //   messageValidate.validateImageWithBase64(fileInfo);

  //   const conversation = await Conversation.getByIdAndUserId(_id, userId);
  //   const { type } = conversation;

  //   // chỉ thay đổi ảnh nhóm
  //   if (!type) throw new MyError("Upload file fail, only for group");

  //   const { avatar } = conversation;
  //   if (avatar) await awsS3Service.deleteFile(avatar);

  //   const { fileName, fileExtension, fileBase64 } = fileInfo;
  //   const avatarUrl = await awsS3Service.uploadWithBase64(
  //     fileBase64,
  //     fileName,
  //     fileExtension
  //   );

  //   // thêm tin nhắn đổi tên
  //   const newMessage = new Message({
  //     userId,
  //     content: `Ảnh đại diện nhóm đã thay đổi`,
  //     type: "NOTIFY",
  //     conversationId: _id,
  //   });
  //   const saveMessage = await newMessage.save();
  //   // cập nhật conversation
  //   await Conversation.updateOne(
  //     { _id },
  //     { avatar: avatarUrl, lastMessageId: saveMessage._id }
  //   );
  //   // cập nhật lastView thằng đổi
  //   await Member.updateOne(
  //     { conversationId: _id, userId },
  //     { lastView: saveMessage.createdAt }
  //   );

  //   return {
  //     avatar: avatarUrl,
  //     lastMessage: await messageService.getById(saveMessage._id, true),
  //   };
  // }

  /**
   * Xóa một nhóm trò chuyện (conversation) nếu người dùng là trưởng nhóm (leader).
   * @param {*} conversationId : id cuộc trò chuyện
   * @param {*} userId : id người dùng
   */
  async deleteById(conversationId, userId) {
    const conversation = await Conversation.getByIdAndUserId(
      conversationId,
      userId
    );

    // chỉ leader mới được xóa
    const { type, leaderId } = conversation;
    if (!type || leaderId != userId)
      throw new MyError("Not permission delete group");

    await Member.deleteMany({ conversationId });
    await Message.deleteMany({ conversationId });
    await Channel.deleteMany({ conversationId });
    await Conversation.deleteOne({ _id: conversationId });
  }

  /**
   * Cập nhật trạng thái thông báo (isNotify) của người dùng trong một cuộc trò chuyện.
   * @param {*} conversationId : id cuộc trò chuyện
   * @param {*} isNotify : trạng thái thông báo
   * @param {*} userId : id người dùng
   */
  async updateConversationNotify(conversationId, isNotify, userId) {
    const member = await Member.getByConversationIdAndUserId(
      conversationId,
      userId
    );

    member.isNotify = isNotify === 1 ? true : false;
    await member.save();
  }

  /**
   *
   * @param {*} conversationId : id cuộc trò chuyện
   * @param {*} userId : id người dùng
   * @returns Lấy danh sách thành viên của một cuộc trò chuyện cùng với trạng thái xem cuối cùng
   */
  async getLastViewOfMembers(conversationId, userId) {
    await Member.getByConversationIdAndUserId(conversationId, userId);

    const members = await Member.aggregate([
      {
        $match: {
          conversationId: ObjectId(conversationId),
        },
      },

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
            avatar: 1,
          },
          lastView: 1,
        },
      },
    ]);

    return members;
  }

  /**
   *  Cập nhật trạng thái cho phép tham gia nhóm từ liên kết (isJoinFromLink).
   * @param {*} conversationId : id cuộc trò chuyện
   * @param {*} isStatus : trạng thái
   * @param {*} myId : id người dùng
   */
  async updateJoinFromLink(conversationId, isStatus, myId) {
    const conversation = await Conversation.getByIdAndUserId(
      conversationId,
      myId
    );

    const { type, leaderId, managerIds } = conversation;

    const isManager = managerIds.findIndex(
      (userIdEle) => userIdEle + "" === myId
    );

    if (!type || (leaderId + "" !== myId && isManager === -1))
      throw new MyError(
        "Update join from link fail, not is leader, not manager or only conversation group"
      );

    await Conversation.updateOne(
      { _id: conversationId },
      { $set: { isJoinFromLink: isStatus } }
    );
  }

  /**
   *
   * @param {*} conversationId : id cuộc trò chuyện
   * @returns Lấy thông tin tóm tắt của một cuộc trò chuyện nhóm, bao gồm danh sách thành viên.
   */
  async getConversationSummary(conversationId) {
    const conversation = await Conversation.getById(conversationId);
    const { type, isJoinFromLink } = conversation;
    if (!type) throw new MyError("Only conversation group");
    if (!isJoinFromLink)
      throw new MyError("Conversation not permission join from link");

    const conversationSummary = await Conversation.aggregate([
      { $match: { _id: ObjectId(conversationId) } },
      {
        $lookup: {
          from: "users",
          localField: "members",
          foreignField: "_id",
          as: "users",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          avatar: 1,
          users: {
            name: 1,
            avatar: 1,
            avatarColor: 1,
          },
        },
      },
    ]);

    return conversationSummary[0];
  }
}

module.exports = new ConversationService();
