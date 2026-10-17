const crypto = require("crypto");
const mongoose = require("mongoose");

const { generateEsewaSignature } = require("../utils/esewa");
const { recordBookingStatusChange } = require("./bookingHistory.service");

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
 *
 * Supports common JWT payload formats:
 * - user.id
 * - user._id
 * - user.sub
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
 * Generate a unique internal payment reference.
 *
 * This reference identifies our payment attempt.
 * It is not the transaction ID assigned by eSewa.
 */
const generatePaymentReference = () => {
  return `SFP-${crypto.randomBytes(12).toString("hex").toUpperCase()}`;
};

const normalizeEsewaStatus = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toUpperCase();
};

const getEsewaField = (payload, ...keys) => {
  for (const key of keys) {
    if (
      payload &&
      Object.prototype.hasOwnProperty.call(payload, key) &&
      payload[key] !== undefined &&
      payload[key] !== null &&
      String(payload[key]).trim() !== ""
    ) {
      return payload[key];
    }
  }

  return undefined;
};

/**
 * Start a payment attempt for a completed service.
 *
 * Booking lifecycle:
 *
 * COMPLETED
 *     |
 *     v
 * PAYMENT_PENDING
 *     |
 *     +---- CASH ----> PAYMENT_PENDING until payment is confirmed
 *     |
 *     +---- ESEWA --> PAYMENT_PENDING until gateway verification
 *                              |
 *                              v
 *                             PAID
 *
 * Important:
 * A payment attempt must not be created for an unfinished,
 * cancelled, rejected, or otherwise ineligible booking.
 */
const createPayment = async (user, bookingId, method) => {
  const userId = getAuthenticatedUserId(user);

  // Validate the requested payment method.
  if (!["CASH", "ESEWA"].includes(method)) {
    throw new AppError(
      "Unsupported payment method. Use CASH or ESEWA",
      400,
      "INVALID_PAYMENT_METHOD"
    );
  }

  // Only customers can initiate payment.
  if (user.role !== USER_ROLES.CUSTOMER) {
    throw new AppError(
      "Only customers can initiate payments",
      403,
      "PAYMENT_INITIATION_DENIED"
    );
  }

  // Prevent inactive accounts from starting payments.
  if (user.status && user.status !== USER_STATUS.ACTIVE) {
    throw new AppError(
      "Your account is not active",
      403,
      "ACCOUNT_INACTIVE"
    );
  }

  // Validate the booking identifier before querying MongoDB.
  if (!mongoose.isValidObjectId(bookingId)) {
    throw new AppError(
      "Invalid booking ID",
      400,
      "INVALID_ID"
    );
  }

  // Customers can only pay for their own bookings.
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

  // A provider must complete the job before the customer can pay.
  // When payment starts, move COMPLETED to PAYMENT_PENDING.
  //
  // Allow PAYMENT_PENDING as well because a previous request may
  // already have moved the booking into its payment stage.
  if (
    booking.status !== BOOKING_STATUS.COMPLETED &&
    booking.status !== BOOKING_STATUS.PAYMENT_PENDING
  ) {
    throw new AppError(
      "Payment is only available after the job has been completed.",
      400,
      "BOOKING_NOT_READY_FOR_PAYMENT"
    );
  }

  // Never initiate another payment for an already-paid booking.
  if (booking.payment?.status === PAYMENT_STATUS.PAID) {
    throw new AppError(
      "This booking has already been paid",
      409,
      "BOOKING_ALREADY_PAID"
    );
  }

  // Never create another payment when this booking already has
  // an active payment attempt for the same or another method.
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
    if (existingPayment.method === method) {
      // Return the existing attempt instead of creating a duplicate.
      return existingPayment;
    }

    throw new AppError(
      "Another payment attempt is already pending for this booking.",
      409,
      "PAYMENT_ALREADY_PENDING"
    );
  }

  // Move the booking into its payment stage only if it is still
  // COMPLETED. The conditional update prevents two competing
  // requests from both changing the booking at the same time.
  if (booking.status === BOOKING_STATUS.COMPLETED) {
    const updatedBooking = await Booking.findOneAndUpdate(
      {
        _id: booking._id,
        customer: userId,
        status: BOOKING_STATUS.COMPLETED,
      },
      {
        $set: {
          status: BOOKING_STATUS.PAYMENT_PENDING,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedBooking) {
      throw new AppError(
        "The booking status changed. Refresh and try again.",
        409,
        "BOOKING_STATUS_CONFLICT"
      );
    }

    booking.status = updatedBooking.status;
  }

  // Ensure that the booking has a valid pricing amount.
  const amount = Number(booking.pricing?.totalAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError(
      "The booking has an invalid payment amount",
      400,
      "INVALID_PAYMENT_AMOUNT"
    );
  }

  // Create a unique reference for this payment attempt.
  const paymentReference = generatePaymentReference();

  // eSewa payments remain PROCESSING until verified.
  // Cash payments remain PENDING until confirmed by the appropriate
  // payment-confirmation workflow.
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
    amount,
    currency: "NPR",
  });

  // Keep the payment summary on the booking synchronized with the
  // newly created payment attempt.
  booking.payment = booking.payment || {};

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
 * Retrieve a payment only when the authenticated user is either
 * the customer who initiated it or the provider assigned to it.
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

/**
 * Build the signed eSewa checkout form.
 *
 * The payment must already have been created by createPayment().
 * Never mark a payment as PAID merely because a checkout form
 * has been generated or the customer returns to the success URL.
 */
const buildEsewaCheckout = (payment) => {
  if (payment.method !== "ESEWA") {
    throw new AppError(
      "This payment does not use eSewa",
      400,
      "INVALID_PAYMENT_METHOD"
    );
  }

  if (
    !process.env.ESEWA_PRODUCT_CODE ||
    !process.env.ESEWA_SECRET_KEY ||
    !process.env.ESEWA_FORM_URL ||
    !process.env.ESEWA_SUCCESS_URL ||
    !process.env.ESEWA_FAILURE_URL
  ) {
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

/**
 * Verify an eSewa payment with the gateway.
 *
 * Only a successful server-side verification can mark the payment
 * and associated booking as PAID.
 */
const verifyEsewaPayment = async (user, paymentId) => {
  const payment = await getPaymentForUser(user, paymentId);

  if (payment.method !== "ESEWA") {
    throw new AppError(
      "Only eSewa payments can be verified through this endpoint",
      400,
      "INVALID_PAYMENT_METHOD"
    );
  }

  // Make verification idempotent for already-paid payments.
  if (payment.status === PAYMENT_STATUSES.PAID) {
    return payment;
  }

  if (
    !process.env.ESEWA_PRODUCT_CODE ||
    !process.env.ESEWA_STATUS_URL
  ) {
    throw new AppError(
      "eSewa verification configuration is incomplete",
      500,
      "ESEWA_CONFIGURATION_ERROR"
    );
  }

  const query = new URLSearchParams({
    product_code: process.env.ESEWA_PRODUCT_CODE,
    total_amount: Number(payment.amount).toFixed(2),
    transaction_uuid: payment.paymentReference,
  });

  const verificationUrl =
    `${process.env.ESEWA_STATUS_URL}?${query.toString()}`;

  let response;

  try {
    response = await fetch(verificationUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    throw new AppError(
      "Could not verify payment with eSewa. Please retry",
      502,
      "ESEWA_VERIFICATION_UNAVAILABLE"
    );
  }

  if (!response.ok) {
    throw new AppError(
      "Could not verify payment with eSewa. Please retry",
      502,
      "ESEWA_VERIFICATION_UNAVAILABLE"
    );
  }

  let result;

  try {
    result = await response.json();
  } catch (error) {
    throw new AppError(
      "eSewa returned an invalid verification payload",
      502,
      "ESEWA_VERIFICATION_INVALID_RESPONSE"
    );
  }

  const gatewayStatus = normalizeEsewaStatus(
    getEsewaField(result, "status", "transaction_status")
  );

  const gatewayTransactionUuid = getEsewaField(
    result,
    "transaction_uuid",
    "transactionUuid",
    "transactionId",
    "uuid"
  );

  const gatewayProductCode = getEsewaField(
    result,
    "product_code",
    "productCode",
    "scd",
    "merchant_code"
  );

  const gatewayAmount = getEsewaField(
    result,
    "total_amount",
    "totalAmount",
    "amount",
    "amount_paid"
  );

  // Handle unsuccessful gateway responses without marking a
  // payment as successful.
  if (gatewayStatus !== "COMPLETE") {
    if (
      ["NOT_FOUND", "CANCELED", "CANCELLED"].includes(
        gatewayStatus
      )
    ) {
      const failedPayment = await Payment.findOneAndUpdate(
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
            status: PAYMENT_STATUSES.FAILED,
            failureReason: `eSewa status: ${gatewayStatus}`,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (failedPayment) {
        await Booking.updateOne(
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
              "payment.status": PAYMENT_STATUS.FAILED,
            },
          }
        );

        return failedPayment;
      }

      // A concurrent request might already have updated the payment.
      const latestPayment = await Payment.findById(payment._id);

      if (latestPayment?.status === PAYMENT_STATUSES.PAID) {
        return latestPayment;
      }

      return latestPayment || payment;
    }

    // A non-final or unrecognized status is not proof of payment.
    return payment;
  }

  const normalizedGatewayAmount = Number(gatewayAmount);

  // Verify the transaction UUID, merchant product code and amount.
  if (
    gatewayTransactionUuid !== payment.paymentReference ||
    gatewayProductCode !== process.env.ESEWA_PRODUCT_CODE ||
    !Number.isFinite(normalizedGatewayAmount) ||
    Math.abs(normalizedGatewayAmount - Number(payment.amount)) > 0.001
  ) {
    throw new AppError(
      "eSewa verification details do not match the payment",
      409,
      "ESEWA_PAYMENT_MISMATCH"
    );
  }

  const paidAt = new Date();

  // Update only a payment that has not already reached a final state.
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
      new: true,
      runValidators: true,
    }
  );

  if (!updatedPayment) {
    const latestPayment = await Payment.findById(payment._id);

    if (latestPayment?.status === PAYMENT_STATUSES.PAID) {
      // Another verification request may already have completed.
      // Continue to ensure the booking is also marked as paid.
      if (
        latestPayment.booking &&
        mongoose.isValidObjectId(latestPayment.booking)
      ) {
        const repairedBooking = await Booking.findOneAndUpdate(
          {
            _id: latestPayment.booking,
            status: BOOKING_STATUS.PAYMENT_PENDING,
            "payment.transactionId": latestPayment.paymentReference,
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
                latestPayment.gatewayTransactionId ||
                latestPayment.paymentReference,
              "payment.paidAt": latestPayment.paidAt || paidAt,
            },
          },
          {
            new: true,
            runValidators: true,
          }
        );

        if (!repairedBooking) {
          const currentBooking = await Booking.findById(
            latestPayment.booking
          );

          if (currentBooking?.status !== BOOKING_STATUS.PAID) {
            throw new AppError(
              "Payment was verified but the booking could not be updated. Reconciliation is required",
              409,
              "PAYMENT_BOOKING_RECONCILIATION_REQUIRED"
            );
          }
        }
      }

      return latestPayment;
    }

    throw new AppError(
      "Payment status changed during verification",
      409,
      "PAYMENT_STATUS_CONFLICT"
    );
  }

  // Update the booking only when it still belongs to this payment
  // attempt and is waiting for payment.
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
      new: true,
      runValidators: true,
    }
  );

  if (!updatedBooking) {
    // Preserve the verified payment for reconciliation. Do not
    // pretend that the booking update also succeeded.
    const currentBooking = await Booking.findById(payment.booking);

    if (currentBooking?.status !== BOOKING_STATUS.PAID) {
      throw new AppError(
        "Payment was verified but the booking could not be updated. Reconciliation is required",
        409,
        "PAYMENT_BOOKING_RECONCILIATION_REQUIRED"
      );
    }
  }

  return updatedPayment;
};


/**
 * Confirm that a cash payment has been received in full.
 *
 * Can be performed by:
 * - The assigned provider (after customer hands cash on completion)
 * - An administrator (manual reconciliation or override)
 */
const confirmCashPayment = async (user, paymentId) => {
  const userId = getAuthenticatedUserId(user);

  if (!mongoose.isValidObjectId(paymentId)) {
    throw new AppError("Invalid payment ID", 400, "INVALID_ID");
  }

  const payment = await Payment.findById(paymentId);

  if (!payment) {
    throw new AppError("Payment not found", 404, "PAYMENT_NOT_FOUND");
  }

  if (payment.method !== "CASH") {
    throw new AppError(
      "Only cash payments can be confirmed with this action",
      400,
      "INVALID_PAYMENT_METHOD"
    );
  }

  // Role authorization check
  if (user.role === USER_ROLES.PROVIDER) {
    const provider = await Provider.findOne({ user: userId }).select("_id");
    if (!provider || String(payment.provider) !== String(provider._id)) {
      throw new AppError(
        "You can only confirm cash payments for your own bookings",
        403,
        "PAYMENT_CONFIRMATION_DENIED"
      );
    }
  } else if (user.role !== USER_ROLES.ADMIN) {
    throw new AppError(
      "Only assigned providers or administrators can confirm cash payments",
      403,
      "PAYMENT_CONFIRMATION_DENIED"
    );
  }

  // Idempotency: if already paid, return existing payment
  if (payment.status === PAYMENT_STATUSES.PAID) {
    return payment;
  }

  if (payment.status !== PAYMENT_STATUSES.PENDING) {
    throw new AppError(
      `Cannot confirm cash payment in status ${payment.status}`,
      400,
      "INVALID_PAYMENT_STATUS"
    );
  }

  const paidAt = new Date();

  // Atomically update payment to PAID
  const updatedPayment = await Payment.findOneAndUpdate(
    {
      _id: payment._id,
      status: PAYMENT_STATUSES.PENDING,
    },
    {
      $set: {
        status: PAYMENT_STATUSES.PAID,
        paidAt,
        gatewayTransactionId: `CASH-${payment.paymentReference}`,
        failureReason: null,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedPayment) {
    const latestPayment = await Payment.findById(payment._id);
    if (latestPayment?.status === PAYMENT_STATUSES.PAID) {
      return latestPayment;
    }
    throw new AppError(
      "Payment status changed during confirmation",
      409,
      "PAYMENT_STATUS_CONFLICT"
    );
  }

  // Update associated booking
  const booking = await Booking.findById(payment.booking);
  if (booking) {
    const previousStatus = booking.status;

    booking.status = BOOKING_STATUS.PAID;
    booking.payment = booking.payment || {};
    booking.payment.status = PAYMENT_STATUS.PAID;
    booking.payment.method = "CASH";
    booking.payment.transactionId = updatedPayment.gatewayTransactionId;
    booking.payment.paidAt = paidAt;

    await booking.save();

    await recordBookingStatusChange({
      bookingId: booking._id,
      previousStatus,
      newStatus: BOOKING_STATUS.PAID,
      userId,
      actorRole: user.role,
      reason: `Cash payment confirmed by ${user.role.toLowerCase()}`,
    });
  }

  return updatedPayment;
};

module.exports = {
  createPayment,
  getPaymentForUser,
  buildEsewaCheckout,
  verifyEsewaPayment,
  confirmCashPayment,
};