const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const messageSerivce = require("../services/MessageService");
const pinMessageValidate = require("../validate/pinMessageValidate");
const MyError = require("../exception/MyError");

class PinMessageService {
  /**
   *
   * @param {*} conversationId : id của cuộc hội thoại
   * @param {*} userId : id của user
   * @returns  Lấy danh sách tất cả tin nhắn được ghim trong một nhóm trò chuyện.
   */
  async getAll(conversationId, userId) {
    const conversation = await Conversation.getByIdAndUserId(
      conversationId,
      userId
    );
    const { type, pinMessageIds } = conversation;

    if (!type) throw new MyError("Only grop conversation");

    const pinMessagesResult = [];

    // Lấy danh sách tin nhắn được ghim
    for (const messageId of pinMessageIds) {
      pinMessagesResult.push(await messageSerivce.getById(messageId, type));
    }

    return pinMessagesResult;
  }

  /**
   *
   * @param {*} messageId : id của tin nhắn
   * @param {*} userId : id của user
   * @returns Ghim một tin nhắn vào nhóm trò chuyện.
   */
  async add(messageId, userId) {
    const conversation = await pinMessageValidate.validateMessage(
      messageId,
      userId
    );
    const { _id, type, pinMessageIds } = conversation;

    // Kiểm tra xem cuộc trò chuyện có phải là nhóm không và số lượng tin nhắn được ghim có nhỏ hơn 3 không ?
    if (!type || pinMessageIds.includes(messageId) || pinMessageIds.length >= 3)
      throw new MyError("Pin message only conversation, < 3 pin");

    await Conversation.updateOne(
      { _id },
      { $push: { pinMessageIds: messageId } }
    );

    const newMessage = new Message({
      content: "PIN_MESSAGE",
      userId,
      type: "NOTIFY",
      conversationId: _id,
    });

    const saveMessage = await newMessage.save();

    return {
      conversationId: _id,
      message: await messageSerivce.updateWhenHasNewMessage(
        saveMessage,
        _id,
        userId
      ),
    };
  }

  async delete(messageId, userId) {
    const conversation = await pinMessageValidate.validateMessage(
      messageId,
      userId
    );

    const { _id, type, pinMessageIds } = conversation;

    if (!type || pinMessageIds.length === 0)
      throw new MyError("Pin message only conversation");

    await Conversation.updateOne(
      { _id },
      { $pull: { pinMessageIds: messageId } }
    );

    const newMessage = new Message({
      content: "NOT_PIN_MESSAGE",
      userId,
      type: "NOTIFY",
      conversationId: _id,
    });

    const saveMessage = await newMessage.save();

    return {
      conversationId: _id,
      message: await messageSerivce.updateWhenHasNewMessage(
        saveMessage,
        _id,
        userId
      ),
    };
  }
}

module.exports = new PinMessageService();
