const mongoose = require("mongoose");

// Booking status
const BOOKING_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  SCHEDULED: "SCHEDULED",
  PROVIDER_ON_WAY: "PROVIDER_ON_WAY",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",

  PAYMENT_PENDING: "PAYMENT_PENDING",
  PAID: "PAID",
  REVIEWED: "REVIEWED",

  REJECTED: "REJECTED",
  CANCELLED_BY_CUSTOMER: "CANCELLED_BY_CUSTOMER",
  CANCELLED_BY_PROVIDER: "CANCELLED_BY_PROVIDER",
  EXPIRED: "EXPIRED",
};

// Payment status
const PAYMENT_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
};

// Booking source
const BOOKING_SOURCE = {
  APP: "APP",
  ADMIN: "ADMIN",
};

// Booking schema
const bookingSchema = new mongoose.Schema(
  {
    // Customer
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Customer is required"],
      index: true,
    },

    // Provider
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      required: [true, "Provider is required"],
      index: true,
    },

    // Service
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: [true, "Service is required"],
      index: true,
    },

    // Provider service
    // Stores the exact provider-specific service and pricing selected at booking time.
    providerService: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProviderService",
      required: [true, "Provider service is required"],
    },

    // Booking number
    // Human-friendly booking reference.
    // Example: SF-20261008-000001
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    // Booking status
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.PENDING,
      index: true,
    },

    // Booking date
    scheduledDate: {
      type: Date,
      required: [true, "Scheduled date is required"],
      index: true,
    },

    // Start and end time
    // Actual requested appointment time is stored separately.
    startTime: {
      type: String,
      required: [true, "Start time is required"],
      trim: true,
    },

    endTime: {
      type: String,
      required: [true, "End time is required"],
      trim: true,
    },

    // Customer address
    address: {
      label: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },

      fullAddress: {
        type: String,
        required: [true, "Service address is required"],
        trim: true,
        maxlength: 500,
      },

      city: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },

      district: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },

      latitude: {
        type: Number,
        min: -90,
        max: 90,
        default: null,
      },

      longitude: {
        type: Number,
        min: -180,
        max: 180,
        default: null,
      },
    },

    // Customer notes
    customerNote: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },

    // Provider note
    providerNote: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },

    // Pricing snapshot
    //
    // Pricing is stored at booking time.
    // If the provider later changes the price,
    // old bookings remain unchanged.
    pricing: {
      basePrice: {
        type: Number,
        required: true,
        min: 0,
      },

      quantity: {
        type: Number,
        min: 1,
        default: 1,
      },

      subtotal: {
        type: Number,
        required: true,
        min: 0,
      },

      discount: {
        type: Number,
        min: 0,
        default: 0,
      },

      platformFee: {
        type: Number,
        min: 0,
        default: 0,
      },

      tax: {
        type: Number,
        min: 0,
        default: 0,
      },

      totalAmount: {
        type: Number,
        required: true,
        min: 0,
      },

      currency: {
        type: String,
        default: "NPR",
        enum: ["NPR"],
      },
    },

    // Payment
    payment: {
      status: {
        type: String,
        enum: Object.values(PAYMENT_STATUS),
        default: PAYMENT_STATUS.PENDING,
        index: true,
      },

      method: {
        type: String,
        enum: ["CASH", "ESEWA"],
        default: null,
      },

      transactionId: {
        type: String,
        trim: true,
        default: null,
      },

      paidAt: {
        type: Date,
        default: null,
      },
    },

    // Cancellation
    cancellation: {
      reason: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: null,
      },

      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      cancelledAt: {
        type: Date,
        default: null,
      },
    },

    // Rejection
    rejection: {
      reason: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: null,
      },

      rejectedAt: {
        type: Date,
        default: null,
      },
    },

    // Completion
    completedAt: {
      type: Date,
      default: null,
    },

    // Review
    review: {
      submitted: {
        type: Boolean,
        default: false,
      },

      reviewId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
        default: null,
      },
    },

    // Booking source
    source: {
      type: String,
      enum: Object.values(BOOKING_SOURCE),
      default: BOOKING_SOURCE.APP,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Indexes
bookingSchema.index({
  customer: 1,
  status: 1,
  createdAt: -1,
});

bookingSchema.index({
  provider: 1,
  status: 1,
  scheduledDate: 1,
});

bookingSchema.index({
  service: 1,
  scheduledDate: 1,
});

bookingSchema.index({
  provider: 1,
  scheduledDate: 1,
  startTime: 1,
});

module.exports = {
  Booking: mongoose.model("Booking", bookingSchema),
  BOOKING_STATUS,
  PAYMENT_STATUS,
  BOOKING_SOURCE,
};
