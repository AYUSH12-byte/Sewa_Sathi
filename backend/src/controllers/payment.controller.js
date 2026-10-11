const asyncHandler = require("../utils/asyncHandler");
const { createdResponse, successResponse } = require("../utils/apiResponse");

const {
  createPayment,
  getPaymentForUser,
} = require("../services/payment.service");

const create = asyncHandler(async (req, res) => {
  const payment = await createPayment(
    req.user,
    req.validated.params.bookingId,
    req.validated.body.method,
  );

  return createdResponse({
    res,
    message:
      payment.method === "ESEWA"
        ? "Payment record created. Gateway checkout integration is the next step."
        : "Cash payment record created successfully",
    data: { payment },
  });
});

const getOne = asyncHandler(async (req, res) => {
  const payment = await getPaymentForUser(req.user, req.validated.params.id);

  return successResponse({
    res,
    message: "Payment retrieved successfully",
    data: { payment },
  });
});

module.exports = {
  create,
  getOne,
};
