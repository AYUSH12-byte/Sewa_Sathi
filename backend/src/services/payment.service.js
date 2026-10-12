
const crypto = require("crypto");
const mongoose = require("mongoose");

const { generateEsewaSignature } = require("../utils/esewa");

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


const buildEsewaCheckout = (payment) => {
  if (payment.method !== "ESEWA") {
    throw new AppError(
      "This payment does not use eSewa",
      400,
      "INVALID_PAYMENT_METHOD"
    );
  }

  if (!process.env.ESEWA_PRODUCT_CODE ||
      !process.env.ESEWA_SECRET_KEY ||
      !process.env.ESEWA_FORM_URL ||
      !process.env.ESEWA_SUCCESS_URL ||
      !process.env.ESEWA_FAILURE_URL) {
    throw new AppError(
      "eSewa payment configuration is incomplete",
      500,
      "ESEWA_CONFIGURATION_ERROR"
    );
  }

  const totalAmount = Number(payment.amount).toFixed(2);
  const transactionUuid = payment.paymentReference;
  const productCode = process.env.ESEWA_PRODUCT_CODE;

  const { signedFieldNames, signature } =
    generateEsewaSignature({
      totalAmount,
      transactionUuid,
      productCode,
    });

  return {
    formUrl: process.env.ESEWA_FORM_URL,
    fields: {
      amount: totalAmount,
      tax_amount: "0",
      total_amount: totalAmount,
      transaction_uuid: transactionUuid,
      product_code: productCode,
      product_service_charge: "0",
      product_delivery_charge: "0",
      success_url: process.env.ESEWA_SUCCESS_URL,
      failure_url: process.env.ESEWA_FAILURE_URL,
      signed_field_names: signedFieldNames,
      signature,
    },
  };
};


const verifyEsewaPayment = async (user, paymentId) => {
  const payment = await getPaymentForUser(user, paymentId);

  if (payment.method !== "ESEWA") {
    throw new AppError(
      "Only eSewa payments can be verified through this endpoint",
      400,
      "INVALID_PAYMENT_METHOD"
    );
  }

  if (payment.status === PAYMENT_STATUSES.PAID) {
    return payment;
  }

  const query = new URLSearchParams({
    product_code: process.env.ESEWA_PRODUCT_CODE,
    total_amount: Number(payment.amount).toFixed(2),
    transaction_uuid: payment.paymentReference,
  });

  const verificationUrl =
    `${process.env.ESEWA_STATUS_URL}?${query.toString()}`;

  const response = await fetch(verificationUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new AppError(
      "Could not verify payment with eSewa. Please retry",
      502,
      "ESEWA_VERIFICATION_UNAVAILABLE"
    );
  }

  const result = await response.json();

  const gatewayStatus = result.status;
  const gatewayTransactionUuid =
    result.transaction_uuid || result.transactionUuid;
  const gatewayProductCode =
    result.product_code || result.scd;
  const gatewayAmount =
    result.total_amount ?? result.totalAmount;

  if (gatewayStatus !== "COMPLETE") {
    if (["NOT_FOUND", "CANCELED", "CANCELLED"].includes(gatewayStatus)) {
      payment.status = PAYMENT_STATUSES.FAILED;
      payment.failureReason = `eSewa status: ${gatewayStatus}`;
      await payment.save();

      await Booking.updateOne(
        {
          _id: payment.booking,
          status: BOOKING_STATUS.PAYMENT_PENDING,
          "payment.transactionId": payment.paymentReference,
        },
        {
          $set: { "payment.status": PAYMENT_STATUS.FAILED },
        }
      );
    }

    return payment;
  }

  if (
    gatewayTransactionUuid !== payment.paymentReference ||
    gatewayProductCode !== process.env.ESEWA_PRODUCT_CODE ||
    !Number.isFinite(Number(gatewayAmount)) ||
    Math.abs(Number(gatewayAmount) - payment.amount) > 0.001
  ) {
    throw new AppError(
      "eSewa verification details do not match the payment",
      409,
      "ESEWA_PAYMENT_MISMATCH"
    );
  }

  const paidAt = new Date();

  const updatedPayment = await Payment.findOneAndUpdate(
    {
      _id: payment._id,
      status: {
        $in: [
          PAYMENT_STATUSES.PENDING,
          PAYMENT_STATUSES.PROCESSING,
        ],
      },
    },
    {
      $set: {
        status: PAYMENT_STATUSES.PAID,
        gatewayTransactionId:
          result.ref_id || result.refId || null,
        gatewayReference:
          result.ref_id || result.refId || null,
        paidAt,
        failureReason: null,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  if (!updatedPayment) {
    const latestPayment = await Payment.findById(payment._id);

    if (latestPayment?.status === PAYMENT_STATUSES.PAID) {
      return latestPayment;
    }

    throw new AppError(
      "Payment status changed during verification",
      409,
      "PAYMENT_STATUS_CONFLICT"
    );
  }

  const updatedBooking = await Booking.findOneAndUpdate(
    {
      _id: payment.booking,
      status: BOOKING_STATUS.PAYMENT_PENDING,
      "payment.transactionId": payment.paymentReference,
      "payment.status": {
        $in: [
          PAYMENT_STATUS.PENDING,
          PAYMENT_STATUS.PROCESSING,
        ],
      },
    },
    {
      $set: {
        status: BOOKING_STATUS.PAID,
        "payment.status": PAYMENT_STATUS.PAID,
        "payment.transactionId":
          updatedPayment.gatewayTransactionId ||
          payment.paymentReference,
        "payment.paidAt": paidAt,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  if (!updatedBooking) {
    // Keep the payment record for reconciliation instead of
    // claiming that the booking update also succeeded.
    throw new AppError(
      "Payment was verified but the booking could not be updated. Reconciliation is required",
      409,
      "PAYMENT_BOOKING_RECONCILIATION_REQUIRED"
    );
  }

  return updatedPayment;
};


module.exports = {
  createPayment,
  getPaymentForUser,
  buildEsewaCheckout,
  verifyEsewaPayment,
};
