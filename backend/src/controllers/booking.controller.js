const asyncHandler = require("../utils/asyncHandler");

const { createdResponse, successResponse } = require("../utils/apiResponse");

const {
  createBooking,
  getBookingList,
  getBookingDetails,
  acceptBooking,
  rejectBooking,
  cancelBooking,
  updateProviderJobStatus,
} = require("../services/booking.service");

const create = asyncHandler(async (req, res) => {
  const booking = await createBooking(
    req.user.id || req.user._id || req.user.sub,
    req.validated.body,
  );

  return createdResponse({
    res,
    message: "Booking request created successfully",
    data: { booking },
  });
});

const list = asyncHandler(async (req, res) => {
  const result = await getBookingList(req.user, req.validated.query);

  return successResponse({
    res,
    message: "Bookings retrieved successfully",
    data: result.bookings,
    meta: result.pagination,
  });
});

const getOne = asyncHandler(async (req, res) => {
  const booking = await getBookingDetails(req.user, req.validated.params.id);

  return successResponse({
    res,
    message: "Booking retrieved successfully",
    data: { booking },
  });
});

const accept = asyncHandler(async (req, res) => {
  const booking = await acceptBooking(req.user, req.validated.params.id);

  return successResponse({
    res,
    message: "Booking accepted successfully",
    data: { booking },
  });
});

const reject = asyncHandler(async (req, res) => {
  const booking = await rejectBooking(
    req.user,
    req.validated.params.id,
    req.validated.body.reason,
  );

  return successResponse({
    res,
    message: "Booking rejected successfully",
    data: { booking },
  });
});

const cancel = asyncHandler(async (req, res) => {
  const booking = await cancelBooking(
    req.user,
    req.validated.params.id,
    req.validated.body.reason,
  );

  return successResponse({
    res,
    message: "Booking cancelled successfully",
    data: { booking },
  });
});


const updateJobStatus = asyncHandler(async (req, res) => {
  const booking = await updateProviderJobStatus(
    req.user,
    req.validated.params.id,
    req.validated.body.status
  );

  return successResponse({
    res,
    message: `Booking status updated to ${booking.status}`,
    data: { booking },
  });
});


module.exports = {
  create,
  list,
  getOne,
  accept,
  reject,
  cancel,
  updateJobStatus,
};
