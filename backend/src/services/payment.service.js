
const crypto = require("crypto");

const { Booking, BOOKING_STATUS, PAYMENT_STATUS } =
  require("../models/Booking");
const {
  Payment,
  PAYMENT_STATUSES,
} = require("../../models/Payment");
const { Provider } = require("../models/Provider");
const { USER_ROLES } = require("../models/User");
const AppError = require("../utils/AppError");

const createPayment = async (user, bookingId, method) => {
  const userId = user.id || user._id || user.sub;

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
      "Payment is only available after service completion",
      409,
      "BOOKING_NOT_READY_FOR_PAYMENT"
    );
  }

  if (
    booking.payment.status === PAYMENT_STATUS.PAID
  ) {
    throw new AppError(
      "This booking has already been paid",
      409,
      "BOOKING_ALREADY_PAID"
    );
  }

  const existingProcessingPayment = await Payment.findOne({
    booking: booking._id,
    status: {
      $in: [
        PAYMENT_STATUSES.PENDING,
        PAYMENT_STATUSES.PROCESSING,
      ],
    },
  });

  if (existingProcessingPayment) {
    if (existingProcessingPayment.method !== method) {
      throw new AppError(
        "Another payment attempt is already pending",
        409,
        "PAYMENT_ALREADY_PENDING"
      );
    }

    return existingProcessingPayment;
  }

  const paymentReference =
    `SFP-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;

  const payment = await Payment.create({
    booking: booking._id,
    customer: booking.customer,
    provider: booking.provider,
    paymentReference,
    method,
    status:
      method === "ESEWA"
        ? PAYMENT_STATUSES.PROCESSING
        : PAYMENT_STATUSES.PENDING,
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

const getPaymentForUser = async (user, paymentId) => {
  const userId = user.id || user._id || user.sub;

  let query = { _id: paymentId };

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

  const payment = await Payment.findOne(query).populate(
    "booking",
    "bookingNumber status scheduledDate pricing"
  );

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
