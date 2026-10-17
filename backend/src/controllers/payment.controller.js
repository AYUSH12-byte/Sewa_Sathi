
const asyncHandler = require("../utils/asyncHandler");

const {
  createdResponse,
  successResponse,
} = require("../utils/apiResponse");

const {
  createPayment,
  getPaymentForUser,
  buildEsewaCheckout,
  verifyEsewaPayment,
  confirmCashPayment,
} = require("../services/payment.service");

/**
 * Create a payment for a customer's booking.
 *
 * Supported payment methods:
 * - CASH: Create a cash payment record.
 * - ESEWA: Create a payment record and prepare the eSewa checkout form.
 *
 * The payment service handles booking ownership and payment eligibility.
 */
const create = asyncHandler(async (req, res) => {
  const payment = await createPayment(
    req.user,
    req.validated.params.bookingId,
    req.validated.body.method
  );

  // Only eSewa payments need checkout form details.
  // Cash payments do not redirect the customer to an online gateway.
  const checkout =
    payment.method === "ESEWA"
      ? buildEsewaCheckout(payment)
      : null;

  return createdResponse({
    res,
    message: checkout
      ? "eSewa checkout is ready."
      : "Cash payment record created successfully.",
    data: {
      payment,
      checkout,
    },
  });
});

/**
 * Get a payment by its MongoDB ID.
 *
 * The service must verify that the authenticated customer owns the payment
 * or that the authenticated provider is associated with it.
 */
const getOne = asyncHandler(async (req, res) => {
  const payment = await getPaymentForUser(
    req.user,
    req.validated.params.id
  );

  return successResponse({
    res,
    message: "Payment details retrieved successfully.",
    data: {
      payment,
    },
  });
});

/**
 * Verify an eSewa payment.
 *
 * The backend verifies the transaction with eSewa rather than trusting
 * a success message or redirect from the frontend.
 */
const verifyEsewa = asyncHandler(async (req, res) => {
  const payment = await verifyEsewaPayment(
    req.user,
    req.validated.params.id
  );

  return successResponse({
    res,
    message:
      payment.status === "PAID"
        ? "Payment verified successfully."
        : "Payment is not yet confirmed.",
    data: {
      payment,
    },
  });
});

/**
 * Confirm receipt of a cash payment.
 *
 * Can be performed by the assigned provider or an administrator.
 */
const confirmCash = asyncHandler(async (req, res) => {
  const payment = await confirmCashPayment(
    req.user,
    req.validated.params.id
  );

  return successResponse({
    res,
    message: "Cash payment confirmed successfully.",
    data: {
      payment,
    },
  });
});

module.exports = {
  create,
  getOne,
  verifyEsewa,
  confirmCash,
};
