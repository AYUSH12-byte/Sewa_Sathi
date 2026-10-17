const mongoose = require("mongoose");

const NOTIFICATION_TYPE = {
  BOOKING: "BOOKING",
  PAYMENT: "PAYMENT",
  REVIEW: "REVIEW",
  COMPLAINT: "COMPLAINT",
  SYSTEM: "SYSTEM",
};

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPE),
      default: NOTIFICATION_TYPE.SYSTEM,
      index: true,
    },

    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    relatedType: {
      type: String,
      enum: ["Booking", "Payment", "Review", "Complaint", null],
      default: null,
    },

    read: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

module.exports = {
  Notification: mongoose.model("Notification", notificationSchema),
  NOTIFICATION_TYPE,
};
