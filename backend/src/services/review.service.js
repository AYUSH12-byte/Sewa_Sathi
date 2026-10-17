const mongoose = require("mongoose");
const { Review, REVIEW_STATUS } = require("../models/Review");
const { Booking, BOOKING_STATUS } = require("../models/Booking");
const { Provider } = require("../models/Provider");
const { USER_ROLES, USER_STATUS } = require("../models/User");
const { recordBookingStatusChange } = require("./bookingHistory.service");
const AppError = require("../utils/AppError");

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
 * Recalculate provider aggregate review stats and persist to Provider document.
 */
const updateProviderReviewStats = async (providerId) => {
  const providerObjectId = new mongoose.Types.ObjectId(providerId);

  const stats = await Review.aggregate([
    {
      $match: {
        provider: providerObjectId,
        status: REVIEW_STATUS.ACTIVE,
      },
    },
    {
      $group: {
        _id: "$provider",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Provider.findByIdAndUpdate(providerObjectId, {
      $set: {
        "stats.averageRating": Math.round(stats[0].averageRating * 10) / 10,
        "stats.totalReviews": stats[0].totalReviews,
      },
    });
  } else {
    await Provider.findByIdAndUpdate(providerObjectId, {
      $set: {
        "stats.averageRating": 0,
        "stats.totalReviews": 0,
      },
    });
  }
};

/**
 * Submit a review for a completed and paid booking.
 */
const createReview = async (user, { bookingId, rating, comment }) => {
  const userId = getAuthenticatedUserId(user);

  if (user.role !== USER_ROLES.CUSTOMER) {
    throw new AppError(
      "Only customers can submit reviews",
      403,
      "REVIEW_SUBMISSION_DENIED"
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
    throw new AppError("Invalid booking ID", 400, "INVALID_ID");
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    customer: userId,
  });

  if (!booking) {
    throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
  }

  if (booking.status !== BOOKING_STATUS.PAID) {
    throw new AppError(
      "Reviews can only be submitted for completed and paid bookings",
      400,
      "BOOKING_NOT_ELIGIBLE_FOR_REVIEW"
    );
  }

  const existingReview = await Review.findOne({ booking: booking._id });
  if (existingReview) {
    throw new AppError(
      "You have already submitted a review for this booking",
      409,
      "REVIEW_ALREADY_EXISTS"
    );
  }

  const review = await Review.create({
    booking: booking._id,
    customer: userId,
    provider: booking.provider,
    service: booking.service || null,
    rating,
    comment: comment || "",
    status: REVIEW_STATUS.ACTIVE,
  });

  // Update booking lifecycle state to REVIEWED
  const previousStatus = booking.status;
  booking.status = BOOKING_STATUS.REVIEWED;
  await booking.save();

  // Audit trail
  await recordBookingStatusChange({
    bookingId: booking._id,
    previousStatus,
    newStatus: BOOKING_STATUS.REVIEWED,
    userId,
    actorRole: USER_ROLES.CUSTOMER,
    reason: "Customer submitted service review",
  });

  // Update provider aggregate statistics
  await updateProviderReviewStats(booking.provider);

  return Review.findById(review._id)
    .populate("customer", "firstName lastName profileImage")
    .populate("provider", "businessName")
    .lean();
};

/**
 * Get public reviews for a provider profile with pagination.
 */
const getProviderReviews = async (providerId, query = {}) => {
  if (!mongoose.isValidObjectId(providerId)) {
    throw new AppError("Invalid provider ID", 400, "INVALID_ID");
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = {
    provider: providerId,
    status: REVIEW_STATUS.ACTIVE,
  };

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate("customer", "firstName lastName profileImage")
      .populate("service", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);

  return {
    reviews,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Get reviews written by the authenticated customer.
 */
const getMyReviews = async (user, query = {}) => {
  const userId = getAuthenticatedUserId(user);

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = {
    customer: userId,
  };

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate("provider", "businessName")
      .populate("booking", "bookingNumber scheduledDate")
      .populate("service", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);

  return {
    reviews,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Get a single review by ID.
 */
const getReviewById = async (reviewId) => {
  if (!mongoose.isValidObjectId(reviewId)) {
    throw new AppError("Invalid review ID", 400, "INVALID_ID");
  }

  const review = await Review.findById(reviewId)
    .populate("customer", "firstName lastName profileImage")
    .populate("provider", "businessName")
    .populate("service", "name")
    .lean();

  if (!review) {
    throw new AppError("Review not found", 404, "REVIEW_NOT_FOUND");
  }

  return review;
};

module.exports = {
  createReview,
  getProviderReviews,
  getMyReviews,
  getReviewById,
  updateProviderReviewStats,
};
