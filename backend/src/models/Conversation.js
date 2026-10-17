const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
      index: true,
    },

    lastMessage: {
      text: {
        type: String,
        trim: true,
        default: "",
      },
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      createdAt: {
        type: Date,
        default: null,
      },
    },

    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

module.exports = {
  Conversation: mongoose.model("Conversation", conversationSchema),
};
