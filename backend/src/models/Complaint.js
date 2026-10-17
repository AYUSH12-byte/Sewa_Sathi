const mongoose = require("mongoose");
const crypto = require("crypto");

const COMPLAINT_STATUS = {
  PENDING: "PENDING",
  UNDER_REVIEW: "UNDER_REVIEW",
  RESOLVED: "RESOLVED",
  DISMISSED: "DISMISSED",
};

const COMPLAINT_TYPE = {
  SERVICE_QUALITY: "SERVICE_QUALITY",
  BEHAVIOR: "BEHAVIOR",
  PRICING: "PRICING",
  NO_SHOW: "NO_SHOW",
  DAMAGE: "DAMAGE",
  OTHER: "OTHER",
};

const complaintSchema = new mongoose.Schema(
  {
    complaintNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    reporterRole: {
      type: String,
      enum: ["CUSTOMER", "PROVIDER"],
      required: true,
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
      index: true,
    },

    againstUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    type: {
      type: String,
      enum: Object.values(COMPLAINT_TYPE),
      required: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    status: {
      type: String,
      enum: Object.values(COMPLAINT_STATUS),
      default: COMPLAINT_STATUS.PENDING,
      index: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    resolution: {
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      resolvedAt: {
        type: Date,
        default: null,
      },

      notes: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: null,
      },

      actionTaken: {
        type: String,
        trim: true,
        maxlength: 500,
        default: null,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ reporter: 1, createdAt: -1 });

module.exports = {
  Complaint: mongoose.model("Complaint", complaintSchema),
  COMPLAINT_STATUS,
  COMPLAINT_TYPE,
};
