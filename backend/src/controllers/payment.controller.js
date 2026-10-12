const asyncHandler = require("../utils/asyncHandler");

const { createdResponse, successResponse } = require("../utils/apiResponse");

const {
  createPayment,
  getPaymentForUser,
  buildEsewaCheckout,
  verifyEsewaPayment,
} = require("../services/payment.service");

const create = asyncHandler(async (req, res) => {
  const payment = await createPayment(
    req.user,
    req.validated.params.bookingId,
    req.validated.body.method
  );

  const checkout =
    payment.method === "ESEWA"
      ? buildEsewaCheckout(payment)
      : null;

  return createdResponse({
    res,
    message: checkout
      ? "eSewa checkout is ready"
      : "Cash payment record created successfully",
    data: {
      payment,
      checkout,
    },
  });
});


const verifyEsewa = asyncHandler(async (req, res) => {
  const payment = await verifyEsewaPayment(
    req.user,
    req.validated.params.id
  );

  return successResponse({
    res,
    message:
      payment.status === "PAID"
        ? "Payment verified successfully"
        : "Payment is not yet confirmed",
    data: { payment },
  });
});


module.exports = {
  create,
  verifyEsewa,

};
