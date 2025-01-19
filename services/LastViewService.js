const Member = require("../models/Member");

class LastViewService {
  /**
   * Cập nhật thời gian xem cuối của cuộc trò chuyện
   * @param {*} conversationId: id của cuộc trò chuyện
   * @param {*} userId: id của người dùng
   */
  async updateLastViewOfConversation(conversationId, userId) {
    await Member.updateOne(
      { conversationId, userId },
      { $set: { lastView: new Date() } }
    );
  }

  /**
   * @param {*} conversationId : id của cuộc trò chuyện
   * @param {*} channelId: id của kênh chat
   * @param {*} userId: id của người
   * @returns  Cập nhật thời gian xem cuối của kênh chat
   */
  async updateLastViewOfChannel(conversationId, channelId, userId) {
    const member = await Member.getByConversationIdAndUserId(
      conversationId,
      userId
    );

    const { lastViewOfChannels } = member; // thời gian xem cuối của các kênh chat

    const index = lastViewOfChannels.findIndex(
      (lastViewEle) => lastViewEle.channelId + "" == channelId + ""
    );

    // not exists
    if (index === -1) return;

    lastViewOfChannels[index].lastView = new Date(); // Cập nhật thời gian xem cuối của channel

    await member.save();
  }
}

module.exports = new LastViewService();
