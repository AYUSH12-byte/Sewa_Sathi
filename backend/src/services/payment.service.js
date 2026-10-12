
const crypto = require("crypto");
const mongoose = require("mongoose");

const {
  Booking,
  BOOKING_STATUS,
  PAYMENT_STATUS,
} = require("../models/Booking");

const {
  Payment,
  PAYMENT_STATUSES,
} = require("../models/Payment");

const { Provider } = require("../models/Provider");
const { USER_ROLES, USER_STATUS } = require("../models/User");
const AppError = require("../utils/AppError");

/**
 * Resolve and validate the authenticated user's MongoDB ID.
 */
const getAuthenticatedUserId = (user) => {
  const userId = user?.id || user?._id || user?.sub;

  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw new AppError(
      "Invalid authenticated user",
      401,
      "INVALID_AUTHENTICATED_USER"
    );
  }

  return userId;
};

/**
 * Create a unique internal payment reference.
 * This is not an eSewa transaction ID.
 */
const generatePaymentReference = () => {
  return `SFP-${crypto.randomBytes(12).toString("hex").toUpperCase()}`;
};

/**
 * Start a payment attempt for a completed service.
 *
 * CASH:
 *   Creates a pending cash payment record.
 *
 * ESEWA:
 *   Creates a processing payment record.
 *   Actual checkout and server-side verification must be
 *   implemented separately before marking it as paid.
 */
const createPayment = async (user, bookingId, method) => {
  const userId = getAuthenticatedUserId(user);

  if (!["CASH", "ESEWA"].includes(method)) {
    throw new AppError(
      "Unsupported payment method. Use CASH or ESEWA",
      400,
      "INVALID_PAYMENT_METHOD"
    );
  }

  if (user.role !== USER_ROLES.CUSTOMER) {
    throw new AppError(
      "Only customers can initiate payments",
      403,
      "PAYMENT_INITIATION_DENIED"
    );
  }

  if (user.status && user.status !== USER_STATUS.ACTIVE) {
    throw new AppError(
      "Your account is not active",
      403,
      "ACCOUNT_INACTIVE"
    );
  }

  if (!mongoose.isValidObjectId(bookingId)) {
    throw new AppError(
      "Invalid booking ID",
      400,
      "INVALID_ID"
    );
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    customer: userId,
  });

  if (!booking) {
    throw new AppError(
      "Booking not found",
      404,
      "BOOKING_NOT_FOUND"
    );
  }

  if (booking.status !== BOOKING_STATUS.PAYMENT_PENDING) {
    throw new AppError(
      "Payment is only available when the booking is awaiting payment",
      409,
      "BOOKING_NOT_READY_FOR_PAYMENT"
    );
  }

  if (booking.payment?.status === PAYMENT_STATUS.PAID) {
    throw new AppError(
      "This booking has already been paid",
      409,
      "BOOKING_ALREADY_PAID"
    );
  }

  const existingPayment = await Payment.findOne({
    booking: booking._id,
    status: {
      $in: [
        PAYMENT_STATUSES.PENDING,
        PAYMENT_STATUSES.PROCESSING,
      ],
    },
  }).sort({ createdAt: -1 });

  if (existingPayment) {
    if (existingPayment.method !== method) {
      throw new AppError(
        "Another payment attempt is already pending",
        409,
        "PAYMENT_ALREADY_PENDING"
      );
    }

    // Return the existing attempt rather than creating duplicates.
    return existingPayment;
  }

  const paymentReference = generatePaymentReference();

  const paymentStatus =
    method === "ESEWA"
      ? PAYMENT_STATUSES.PROCESSING
      : PAYMENT_STATUSES.PENDING;

  const payment = await Payment.create({
    booking: booking._id,
    customer: booking.customer,
    provider: booking.provider,
    paymentReference,
    method,
    status: paymentStatus,
    amount: booking.pricing.totalAmount,
    currency: "NPR",
  });

  booking.payment.status =
    method === "ESEWA"
      ? PAYMENT_STATUS.PROCESSING
      : PAYMENT_STATUS.PENDING;

  booking.payment.method = method;
  booking.payment.transactionId = paymentReference;

  await booking.save();

  return payment;
};

/**
 * Retrieve a payment only when the authenticated user is
 * the customer who initiated it or the provider assigned
 * to the associated booking.
 */
const getPaymentForUser = async (user, paymentId) => {
  const userId = getAuthenticatedUserId(user);

  if (!mongoose.isValidObjectId(paymentId)) {
    throw new AppError(
      "Invalid payment ID",
      400,
      "INVALID_ID"
    );
  }

  const query = {
    _id: paymentId,
  };

  if (user.role === USER_ROLES.CUSTOMER) {
    query.customer = userId;
  } else if (user.role === USER_ROLES.PROVIDER) {
    const provider = await Provider.findOne({
      user: userId,
    }).select("_id");

    if (!provider) {
      throw new AppError(
        "Provider profile not found",
        404,
        "PROVIDER_PROFILE_NOT_FOUND"
      );
    }

    query.provider = provider._id;
  } else {
    throw new AppError(
      "You are not allowed to access this payment",
      403,
      "PAYMENT_ACCESS_DENIED"
    );
  }

  const payment = await Payment.findOne(query)
    .populate(
      "booking",
      "bookingNumber status scheduledDate pricing payment"
    )
    .populate(
      "customer",
      "firstName lastName"
    )
    .populate(
      "provider",
      "businessName verificationStatus"
    )
    .lean();

  if (!payment) {
    throw new AppError(
      "Payment not found",
      404,
      "PAYMENT_NOT_FOUND"
    );
  }

  return payment;
};

module.exports = {
  createPayment,
  getPaymentForUser,
};
