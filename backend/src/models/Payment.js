
const mongoose = require("mongoose");

const PAYMENT_METHODS = {
  CASH: "CASH",
  ESEWA: "ESEWA",
};

const PAYMENT_STATUSES = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
};

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
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

    paymentReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    method: {
      type: String,
      enum: Object.values(PAYMENT_METHODS),
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUSES),
      default: PAYMENT_STATUSES.PENDING,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    currency: {
      type: String,
      enum: ["NPR"],
      default: "NPR",
    },

    gatewayTransactionId: {
      type: String,
      trim: true,
      default: null,
    },

    gatewayReference: {
      type: String,
      trim: true,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    failureReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

paymentSchema.index({
  booking: 1,
  createdAt: -1,
});

paymentSchema.index({
  method: 1,
  status: 1,
});

module.exports = {
  Payment: mongoose.model("Payment", paymentSchema),
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
};
