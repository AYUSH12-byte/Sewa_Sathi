
const crypto = require("crypto");
const mongoose = require("mongoose");

const {
  recordBookingStatusChange,
} = require("./bookingHistory.service");

const {
  canTransitionBookingStatus,
} = require("../utils/bookingStatus");

const {
  Booking,
  BOOKING_STATUS,
} = require("../models/Booking");

const {
  Provider,
  PROVIDER_VERIFICATION_STATUS,
} = require("../models/Provider");

const { ProviderService } = require("../models/ProviderService");

const {
  User,
  USER_ROLES,
  USER_STATUS,
} = require("../models/User");

const AppError = require("../utils/AppError");

/* =========================================================
   BOOKING CONSTANTS
========================================================= */

const ACTIVE_BOOKING_STATUSES = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.ACCEPTED,
  BOOKING_STATUS.SCHEDULED,
  BOOKING_STATUS.PROVIDER_ON_WAY,
  BOOKING_STATUS.IN_PROGRESS,
];

const ALLOWED_PROGRESS_STATUSES = [
  BOOKING_STATUS.SCHEDULED,
  BOOKING_STATUS.PROVIDER_ON_WAY,
  BOOKING_STATUS.IN_PROGRESS,
  BOOKING_STATUS.COMPLETED,
];

/* =========================================================
   BOOKING UTILITIES
========================================================= */

const generateBookingNumber = () => {
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const suffix = crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase();

  return `SFB-${date}-${suffix}`;
};

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

const getDayName = (date) => {
  return [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ][date.getDay()];
};

const minutesFromTime = (time) => {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
};

/* =========================================================
   POPULATE BOOKING DETAILS
========================================================= */

const populateBooking = async (bookingId) => {
  return Booking.findById(bookingId)
    .populate(
      "customer",
      "firstName lastName phone email"
    )
    .populate({
      path: "provider",
      populate: {
        path: "user",
        select: "firstName lastName phone",
      },
    })
    .populate("service", "name slug description")
    .populate(
      "providerService",
      "price priceType description"
    );
};

/* =========================================================
   CREATE BOOKING
========================================================= */

const createBooking = async (customerId, bookingData) => {
  const customer = await User.findById(customerId);

  if (
    !customer ||
    customer.role !== USER_ROLES.CUSTOMER
  ) {
    throw new AppError(
      "Only customer accounts can create bookings",
      403,
      "CUSTOMER_ONLY"
    );
  }

  if (customer.status !== USER_STATUS.ACTIVE) {
    throw new AppError(
      "Your account is not active",
      403,
      "ACCOUNT_INACTIVE"
    );
  }

  const provider = await Provider.findById(
    bookingData.providerId
  ).populate("user", "status role");

  if (!provider) {
    throw new AppError(
      "Provider not found",
      404,
      "PROVIDER_NOT_FOUND"
    );
  }

  if (
    provider.verificationStatus !==
    PROVIDER_VERIFICATION_STATUS.VERIFIED
  ) {
    throw new AppError(
      "This provider is not verified for bookings",
      409,
      "PROVIDER_NOT_VERIFIED"
    );
  }

  if (
    !provider.user ||
    provider.user.status !== USER_STATUS.ACTIVE ||
    provider.user.role !== USER_ROLES.PROVIDER
  ) {
    throw new AppError(
      "This provider account is not active",
      409,
      "PROVIDER_INACTIVE"
    );
  }

  const providerService = await ProviderService.findOne({
    _id: bookingData.providerServiceId,
    provider: provider._id,
    isActive: true,
  }).populate("service");

  if (!providerService) {
    throw new AppError(
      "The provider does not offer this active service",
      404,
      "PROVIDER_SERVICE_NOT_FOUND"
    );
  }

  const service = providerService.service;

  if (!service || !service.isActive) {
    throw new AppError(
      "This service is currently unavailable",
      409,
      "SERVICE_INACTIVE"
    );
  }

  const scheduledDate = new Date(
    bookingData.scheduledDate
  );

  if (Number.isNaN(scheduledDate.getTime())) {
    throw new AppError(
      "Invalid booking date",
      400,
      "INVALID_BOOKING_DATE"
    );
  }

  const startMinutes = minutesFromTime(
    bookingData.startTime
  );

  const endMinutes = minutesFromTime(
    bookingData.endTime
  );

  if (endMinutes <= startMinutes) {
    throw new AppError(
      "End time must be later than start time",
      400,
      "INVALID_BOOKING_TIME"
    );
  }

  const now = new Date();

  // This project currently interprets appointment dates using
  // the Node.js server's local timezone. Configure the server
  // timezone consistently before production deployment.
  const requestedDay = new Date(scheduledDate);
  requestedDay.setHours(0, 0, 0, 0);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  if (requestedDay < today) {
    throw new AppError(
      "Booking date cannot be in the past",
      400,
      "BOOKING_DATE_IN_PAST"
    );
  }

  const dayName = getDayName(scheduledDate);
  const dayAvailability = provider.availability?.[dayName];

  if (
    !dayAvailability?.enabled ||
    !dayAvailability.startTime ||
    !dayAvailability.endTime
  ) {
    throw new AppError(
      "Provider is not available on the selected day",
      409,
      "PROVIDER_UNAVAILABLE"
    );
  }

  const availableStart = minutesFromTime(
    dayAvailability.startTime
  );

  const availableEnd = minutesFromTime(
    dayAvailability.endTime
  );

  if (
    startMinutes < availableStart ||
    endMinutes > availableEnd
  ) {
    throw new AppError(
      "Selected time is outside the provider's working hours",
      409,
      "OUTSIDE_PROVIDER_HOURS"
    );
  }

  if (requestedDay.getTime() === today.getTime()) {
    const currentMinutes =
      now.getHours() * 60 + now.getMinutes();

    if (startMinutes <= currentMinutes) {
      throw new AppError(
        "Booking start time must be in the future",
        400,
        "BOOKING_TIME_IN_PAST"
      );
    }
  }

  const dayStart = new Date(scheduledDate);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(scheduledDate);
  dayEnd.setHours(23, 59, 59, 999);

  const existingBookings = await Booking.find({
    provider: provider._id,
    scheduledDate: {
      $gte: dayStart,
      $lte: dayEnd,
    },
    status: {
      $in: ACTIVE_BOOKING_STATUSES,
    },
  }).select("startTime endTime");

  const hasOverlap = existingBookings.some((existing) => {
    const existingStart = minutesFromTime(
      existing.startTime
    );

    const existingEnd = minutesFromTime(
      existing.endTime
    );

    return (
      startMinutes < existingEnd &&
      endMinutes > existingStart
    );
  });

  if (hasOverlap) {
    throw new AppError(
      "This time slot is already booked. Please choose another time",
      409,
      "BOOKING_TIME_CONFLICT"
    );
  }

  const quantity = bookingData.quantity || 1;
  const basePrice = providerService.price;
  const subtotal = basePrice * quantity;

  // Never accept the booking price from the client.
  const booking = await Booking.create({
    customer: customer._id,
    provider: provider._id,
    service: service._id,
    providerService: providerService._id,
    bookingNumber: generateBookingNumber(),
    status: BOOKING_STATUS.PENDING,
    scheduledDate,
    startTime: bookingData.startTime,
    endTime: bookingData.endTime,
    address: bookingData.address,
    customerNote: bookingData.customerNote || null,
    pricing: {
      basePrice,
      quantity,
      subtotal,
      discount: 0,
      platformFee: 0,
      tax: 0,
      totalAmount: subtotal,
      currency: "NPR",
    },
  });

  return populateBooking(booking._id);
};

/* =========================================================
   BOOKING ACCESS CONTROL
========================================================= */

const getBookingAccessFilter = async (user) => {
  const userId = getAuthenticatedUserId(user);

  if (user.role === USER_ROLES.CUSTOMER) {
    return {
      customer: userId,
    };
  }

  if (user.role === USER_ROLES.PROVIDER) {
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

    return {
      provider: provider._id,
    };
  }

  throw new AppError(
    "You are not allowed to access customer or provider bookings",
    403,
    "BOOKING_ACCESS_DENIED"
  );
};

/* =========================================================
   LIST BOOKINGS
========================================================= */

const getBookingList = async (user, filters = {}) => {
  const accessFilter = await getBookingAccessFilter(user);
  const query = { ...accessFilter };

  if (filters.status) {
    const allowedStatuses = Object.values(
      BOOKING_STATUS
    );

    if (!allowedStatuses.includes(filters.status)) {
      throw new AppError(
        "Invalid booking status filter",
        400,
        "INVALID_BOOKING_STATUS"
      );
    }

    query.status = filters.status;
  }

  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const skip = (page - 1) * limit;

  const [bookings, total] = await Promise.all([
    Booking.find(query)
      .populate(
        "customer",
        "firstName lastName phone email"
      )
      .populate({
        path: "provider",
        populate: {
          path: "user",
          select: "firstName lastName phone",
        },
      })
      .populate("service", "name slug")
      .populate(
        "providerService",
        "price priceType"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Booking.countDocuments(query),
  ]);

  return {
    bookings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
};

/* =========================================================
   GET BOOKING DETAILS
========================================================= */

const getBookingDetails = async (user, bookingId) => {
  const accessFilter = await getBookingAccessFilter(user);

  const booking = await Booking.findOne({
    _id: bookingId,
    ...accessFilter,
  })
    .populate(
      "customer",
      "firstName lastName phone email"
    )
    .populate({
      path: "provider",
      populate: {
        path: "user",
        select: "firstName lastName phone",
      },
    })
    .populate("service", "name slug description")
    .populate(
      "providerService",
      "price priceType description"
    );

  if (!booking) {
    throw new AppError(
      "Booking not found",
      404,
      "BOOKING_NOT_FOUND"
    );
  }

  return booking;
};

/* =========================================================
   GET BOOKING FOR ASSIGNED PROVIDER
========================================================= */

const getBookingForProvider = async (user, bookingId) => {
  const userId = getAuthenticatedUserId(user);

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

  const booking = await Booking.findOne({
    _id: bookingId,
    provider: provider._id,
  });

  if (!booking) {
    throw new AppError(
      "Booking not found",
      404,
      "BOOKING_NOT_FOUND"
    );
  }

  return booking;
};

/* =========================================================
   GET BOOKING FOR CUSTOMER
========================================================= */

const getBookingForCustomer = async (user, bookingId) => {
  const userId = getAuthenticatedUserId(user);

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

  return booking;
};

/* =========================================================
   RECORD STATUS CHANGE
========================================================= */

const saveStatusHistory = async ({
  booking,
  previousStatus,
  user,
  reason = null,
}) => {
  return recordBookingStatusChange({
    bookingId: booking._id,
    previousStatus,
    newStatus: booking.status,
    userId: getAuthenticatedUserId(user),
    actorRole: user.role,
    reason,
  });
};

/* =========================================================
   ACCEPT BOOKING
========================================================= */

const acceptBooking = async (user, bookingId) => {
  const booking = await getBookingForProvider(
    user,
    bookingId
  );

  const previousStatus = booking.status;

  if (
    !canTransitionBookingStatus(
      previousStatus,
      BOOKING_STATUS.ACCEPTED
    )
  ) {
    throw new AppError(
      `Cannot accept a booking with status ${previousStatus}`,
      409,
      "INVALID_BOOKING_TRANSITION"
    );
  }

  // Atomic status update avoids overwriting a concurrent change.
  const updatedBooking = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      provider: booking.provider,
      status: previousStatus,
    },
    {
      $set: {
        status: BOOKING_STATUS.ACCEPTED,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  if (!updatedBooking) {
    throw new AppError(
      "The booking status has changed. Refresh and try again",
      409,
      "BOOKING_STATUS_CONFLICT"
    );
  }

  await saveStatusHistory({
    booking: updatedBooking,
    previousStatus,
    user,
  });

  return populateBooking(updatedBooking._id);
};

/* =========================================================
   REJECT BOOKING
========================================================= */

const rejectBooking = async (user, bookingId, reason) => {
  const booking = await getBookingForProvider(
    user,
    bookingId
  );

  const previousStatus = booking.status;

  if (
    !canTransitionBookingStatus(
      previousStatus,
      BOOKING_STATUS.REJECTED
    )
  ) {
    throw new AppError(
      `Cannot reject a booking with status ${previousStatus}`,
      409,
      "INVALID_BOOKING_TRANSITION"
    );
  }

  const updatedBooking = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      provider: booking.provider,
      status: previousStatus,
    },
    {
      $set: {
        status: BOOKING_STATUS.REJECTED,
        rejection: {
          reason,
          rejectedAt: new Date(),
        },
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  if (!updatedBooking) {
    throw new AppError(
      "The booking status has changed. Refresh and try again",
      409,
      "BOOKING_STATUS_CONFLICT"
    );
  }

  await saveStatusHistory({
    booking: updatedBooking,
    previousStatus,
    user,
    reason,
  });

  return populateBooking(updatedBooking._id);
};

/* =========================================================
   CANCEL BOOKING
========================================================= */

const cancelBooking = async (user, bookingId, reason) => {
  let booking;
  let nextStatus;

  if (user.role === USER_ROLES.CUSTOMER) {
    booking = await getBookingForCustomer(
      user,
      bookingId
    );

    nextStatus = BOOKING_STATUS.CANCELLED_BY_CUSTOMER;
  } else if (user.role === USER_ROLES.PROVIDER) {
    booking = await getBookingForProvider(
      user,
      bookingId
    );

    nextStatus = BOOKING_STATUS.CANCELLED_BY_PROVIDER;
  } else {
    throw new AppError(
      "Only the customer or assigned provider can cancel this booking",
      403,
      "BOOKING_CANCELLATION_DENIED"
    );
  }

  const previousStatus = booking.status;

  if (
    !canTransitionBookingStatus(
      previousStatus,
      nextStatus
    )
  ) {
    throw new AppError(
      `Cannot cancel a booking with status ${previousStatus}`,
      409,
      "INVALID_BOOKING_TRANSITION"
    );
  }

  const updatedBooking = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      status: previousStatus,
      ...(user.role === USER_ROLES.CUSTOMER
        ? { customer: getAuthenticatedUserId(user) }
        : { provider: booking.provider }),
    },
    {
      $set: {
        status: nextStatus,
        cancellation: {
          reason,
          cancelledBy: getAuthenticatedUserId(user),
          cancelledAt: new Date(),
        },
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  if (!updatedBooking) {
    throw new AppError(
      "The booking status has changed. Refresh and try again",
      409,
      "BOOKING_STATUS_CONFLICT"
    );
  }

  await saveStatusHistory({
    booking: updatedBooking,
    previousStatus,
    user,
    reason,
  });

  return populateBooking(updatedBooking._id);
};

/* =========================================================
   UPDATE PROVIDER JOB STATUS
========================================================= */

const updateProviderJobStatus = async (
  user,
  bookingId,
  nextStatus
) => {
  const booking = await getBookingForProvider(
    user,
    bookingId
  );

  const previousStatus = booking.status;

  if (!ALLOWED_PROGRESS_STATUSES.includes(nextStatus)) {
    throw new AppError(
      "This status is not available through job progress updates",
      400,
      "INVALID_JOB_STATUS"
    );
  }

  if (
    !canTransitionBookingStatus(
      previousStatus,
      nextStatus
    )
  ) {
    throw new AppError(
      `Cannot change booking from ${previousStatus} to ${nextStatus}`,
      409,
      "INVALID_BOOKING_TRANSITION"
    );
  }

  const updates = {
    status: nextStatus,
  };

  if (nextStatus === BOOKING_STATUS.COMPLETED) {
    updates.completedAt = new Date();
  }

  const updatedBooking = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      provider: booking.provider,
      status: previousStatus,
    },
    {
      $set: updates,
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  if (!updatedBooking) {
    throw new AppError(
      "The booking status has changed. Refresh and try again",
      409,
      "BOOKING_STATUS_CONFLICT"
    );
  }

  await saveStatusHistory({
    booking: updatedBooking,
    previousStatus,
    user,
  });

  return populateBooking(updatedBooking._id);
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createBooking,
  getBookingList,
  getBookingDetails,
  acceptBooking,
  rejectBooking,
  cancelBooking,
  updateProviderJobStatus,
};
