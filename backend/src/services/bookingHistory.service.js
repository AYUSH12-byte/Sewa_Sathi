const mongoose = require("mongoose");

const BookingHistory = require("../models/BookingHistory");
const { Booking } = require("../models/Booking");
const { Provider } = require("../models/Provider");
const AppError = require("../utils/AppError");

const recordBookingStatusChange = async ({
  bookingId,
  previousStatus,
  newStatus,
  userId,
  actorRole,
  reason = null,
}) => {
  return BookingHistory.create({
    booking: bookingId,
    previousStatus,
    newStatus,
    changedBy: userId,
    actorRole,
    reason,
  });
};

const getBookingHistory = async (user, bookingId) => {
  if (!mongoose.isValidObjectId(bookingId)) {
    throw new AppError("Invalid booking ID", 400, "INVALID_ID");
  }

  const userId = user.id || user._id || user.sub;

  let accessFilter;

  if (user.role === "CUSTOMER") {
    accessFilter = { customer: userId };
  } else if (user.role === "PROVIDER") {
    const provider = await Provider.findOne({
      user: userId,
    }).select("_id");

    if (!provider) {
      throw new AppError(
        "Provider profile not found",
        404,
        "PROVIDER_PROFILE_NOT_FOUND",
      );
    }

    accessFilter = { provider: provider._id };
  } else {
    throw new AppError(
      "You are not allowed to access booking history",
      403,
      "BOOKING_HISTORY_ACCESS_DENIED",
    );
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    ...accessFilter,
  }).select("_id");

  if (!booking) {
    throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
  }

  return BookingHistory.find({
    booking: booking._id,
  })
    .populate("changedBy", "firstName lastName role")
    .sort({ createdAt: 1 })
    .lean();
};

module.exports = {
  recordBookingStatusChange,
  getBookingHistory,
};
