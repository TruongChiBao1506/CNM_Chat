const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;

const channelSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    conversationId: {
      type: ObjectId,
      required: true,
    },
  },
  { timestamps: true }
);

const Channel = mongoose.model("channel", channelSchema);

module.exports = Channel;
