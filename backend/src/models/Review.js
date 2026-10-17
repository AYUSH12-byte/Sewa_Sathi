const mongoose = require("mongoose");

const REVIEW_STATUS = {
  ACTIVE: "ACTIVE",
  FLAGGED: "FLAGGED",
  HIDDEN: "HIDDEN",
};

const reviewSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
      index: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
      index: true,
    },

    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      default: null,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    status: {
      type: String,
      enum: Object.values(REVIEW_STATUS),
      default: REVIEW_STATUS.ACTIVE,
      index: true,
    },

    flaggedReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },

    flaggedAt: {
      type: Date,
      default: null,
    },

    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    moderatedAt: {
      type: Date,
      default: null,
    },

    moderationNotes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

reviewSchema.index({ provider: 1, status: 1, createdAt: -1 });
reviewSchema.index({ customer: 1, createdAt: -1 });

module.exports = {
  Review: mongoose.model("Review", reviewSchema),
  REVIEW_STATUS,
};
