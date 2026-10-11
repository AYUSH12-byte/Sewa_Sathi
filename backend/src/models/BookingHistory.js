
const mongoose = require("mongoose");

const bookingHistorySchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },

    previousStatus: {
      type: String,
      required: true,
    },

    newStatus: {
      type: String,
      required: true,
    },

    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    actorRole: {
      type: String,
      enum: ["CUSTOMER", "PROVIDER", "ADMIN", "SYSTEM"],
      required: true,
    },

    reason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

bookingHistorySchema.index({
  booking: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "BookingHistory",
  bookingHistorySchema
);
