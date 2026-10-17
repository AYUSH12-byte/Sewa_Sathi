const mongoose = require("mongoose");
const { User, USER_STATUS, USER_ROLES } = require("../models/User");
const { Provider, PROVIDER_VERIFICATION_STATUS } = require("../models/Provider");
const { Booking, BOOKING_STATUS } = require("../models/Booking");
const { Payment, PAYMENT_STATUSES } = require("../models/Payment");
const { Review, REVIEW_STATUS } = require("../models/Review");
const { Complaint, COMPLAINT_STATUS } = require("../models/Complaint");
const { updateProviderReviewStats } = require("./review.service");
const AppError = require("../utils/AppError");

const getAuthenticatedUserId = (user) => {
  const userId = user?.id || user?._id || user?.sub;
  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw new AppError("Invalid authenticated user", 401, "INVALID_AUTHENTICATED_USER");
  }
  return userId;
};

/**
 * 1. Admin Dashboard Overview Statistics
 */
const getDashboardStats = async () => {
  const [
    userStats,
    providerStats,
    bookingStats,
    revenueStats,
    complaintStats,
    reviewStats,
    recentBookings,
    recentComplaints,
  ] = await Promise.all([
    // User counts by role
    User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ]),

    // Provider counts by verification status
    Provider.aggregate([
      {
        $group: {
          _id: "$verificationStatus",
          count: { $sum: 1 },
        },
      },
    ]),

    // Booking counts by status
    Booking.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),

    // Revenue totals for PAID payments
    Payment.aggregate([
      { $match: { status: PAYMENT_STATUSES.PAID } },
      {
        $group: {
          _id: "$method",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),

    // Complaint counts by status
    Complaint.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),

    // Review counts & platform average
    Review.aggregate([
      { $match: { status: REVIEW_STATUS.ACTIVE } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" },
        },
      },
    ]),

    // 5 most recent bookings
    Booking.find()
      .populate("customer", "firstName lastName phone")
      .populate("provider", "businessName")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),

    // 5 most recent pending complaints
    Complaint.find({ status: COMPLAINT_STATUS.PENDING })
      .populate("reporter", "firstName lastName email")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  // Format user counts
  const users = { total: 0, customers: 0, providers: 0, admins: 0 };
  userStats.forEach((stat) => {
    users.total += stat.count;
    if (stat._id === USER_ROLES.CUSTOMER) users.customers = stat.count;
    if (stat._id === USER_ROLES.PROVIDER) users.providers = stat.count;
    if (stat._id === USER_ROLES.ADMIN) users.admins = stat.count;
  });

  // Format provider counts
  const providers = { total: 0, verified: 0, pending: 0, rejected: 0, suspended: 0 };
  providerStats.forEach((stat) => {
    providers.total += stat.count;
    if (stat._id === PROVIDER_VERIFICATION_STATUS.VERIFIED) providers.verified = stat.count;
    if (stat._id === PROVIDER_VERIFICATION_STATUS.PENDING) providers.pending = stat.count;
    if (stat._id === PROVIDER_VERIFICATION_STATUS.REJECTED) providers.rejected = stat.count;
    if (stat._id === PROVIDER_VERIFICATION_STATUS.SUSPENDED) providers.suspended = stat.count;
  });

  // Format booking counts
  const bookings = { total: 0, pending: 0, inProgress: 0, completed: 0, paid: 0, cancelled: 0 };
  bookingStats.forEach((stat) => {
    bookings.total += stat.count;
    if (stat._id === BOOKING_STATUS.PENDING) bookings.pending = stat.count;
    if ([BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.SCHEDULED, BOOKING_STATUS.PROVIDER_ON_WAY, BOOKING_STATUS.IN_PROGRESS].includes(stat._id)) {
      bookings.inProgress += stat.count;
    }
    if (stat._id === BOOKING_STATUS.COMPLETED || stat._id === BOOKING_STATUS.PAYMENT_PENDING) {
      bookings.completed += stat.count;
    }
    if (stat._id === BOOKING_STATUS.PAID || stat._id === BOOKING_STATUS.REVIEWED) {
      bookings.paid += stat.count;
    }
    if ([BOOKING_STATUS.CANCELLED_BY_CUSTOMER, BOOKING_STATUS.CANCELLED_BY_PROVIDER, BOOKING_STATUS.REJECTED, BOOKING_STATUS.EXPIRED].includes(stat._id)) {
      bookings.cancelled += stat.count;
    }
  });

  // Format revenue totals
  const revenue = { total: 0, cash: 0, esewa: 0, totalTransactions: 0 };
  revenueStats.forEach((stat) => {
    revenue.total += stat.totalAmount;
    revenue.totalTransactions += stat.count;
    if (stat._id === "CASH") revenue.cash = stat.totalAmount;
    if (stat._id === "ESEWA") revenue.esewa = stat.totalAmount;
  });

  // Format complaint counts
  const complaints = { total: 0, pending: 0, underReview: 0, resolved: 0, dismissed: 0 };
  complaintStats.forEach((stat) => {
    complaints.total += stat.count;
    if (stat._id === COMPLAINT_STATUS.PENDING) complaints.pending = stat.count;
    if (stat._id === COMPLAINT_STATUS.UNDER_REVIEW) complaints.underReview = stat.count;
    if (stat._id === COMPLAINT_STATUS.RESOLVED) complaints.resolved = stat.count;
    if (stat._id === COMPLAINT_STATUS.DISMISSED) complaints.dismissed = stat.count;
  });

  // Format reviews summary
  const reviews = {
    total: reviewStats[0]?.totalReviews || 0,
    averageRating: Math.round((reviewStats[0]?.averageRating || 0) * 10) / 10,
  };

  return {
    users,
    providers,
    bookings,
    revenue,
    complaints,
    reviews,
    recentBookings,
    recentComplaints,
  };
};

/**
 * 2. User Management
 */
const getAllUsers = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = {};

  if (query.role && Object.values(USER_ROLES).includes(query.role)) {
    filter.role = query.role;
  }

  if (query.status && Object.values(USER_STATUS).includes(query.status)) {
    filter.status = query.status;
  }

  if (query.search && query.search.trim()) {
    const searchRegex = new RegExp(query.search.trim(), "i");
    filter.$or = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    users,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

const getUserDetail = async (userId) => {
  if (!mongoose.isValidObjectId(userId)) {
    throw new AppError("Invalid user ID", 400, "INVALID_ID");
  }

  const user = await User.findById(userId).lean();
  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  let providerProfile = null;
  if (user.role === USER_ROLES.PROVIDER) {
    providerProfile = await Provider.findOne({ user: user._id }).lean();
  }

  return {
    user,
    providerProfile,
  };
};

const updateUserStatus = async (adminUser, userId, { status, reason }) => {
  const adminId = getAuthenticatedUserId(adminUser);

  if (!mongoose.isValidObjectId(userId)) {
    throw new AppError("Invalid user ID", 400, "INVALID_ID");
  }

  if (String(adminId) === String(userId)) {
    throw new AppError("Administrators cannot change their own account status", 400, "CANNOT_MODIFY_OWN_STATUS");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  user.status = status;

  // If suspended or deactivated, revoke all active sessions immediately
  if (status === USER_STATUS.SUSPENDED || status === USER_STATUS.INACTIVE) {
    user.refreshTokenVersion += 1;
  }

  await user.save();

  // If user is a provider, keep verificationStatus aligned if suspended
  if (user.role === USER_ROLES.PROVIDER && status === USER_STATUS.SUSPENDED) {
    await Provider.findOneAndUpdate(
      { user: user._id },
      {
        $set: {
          verificationStatus: PROVIDER_VERIFICATION_STATUS.SUSPENDED,
          verificationNotes: reason || "Account suspended by administrator",
        },
      }
    );
  }

  return user;
};

/**
 * 3. Booking Oversight
 */
const getAllBookings = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = {};
  if (query.status && Object.values(BOOKING_STATUS).includes(query.status)) {
    filter.status = query.status;
  }
  if (query.paymentStatus) {
    filter["payment.status"] = query.paymentStatus;
  }

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate("customer", "firstName lastName email phone")
      .populate("provider", "businessName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Booking.countDocuments(filter),
  ]);

  return {
    bookings,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * 4. Payment Oversight & Reports
 */
const getAllPayments = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = {};
  if (query.status && Object.values(PAYMENT_STATUSES).includes(query.status)) {
    filter.status = query.status;
  }
  if (query.method) {
    filter.method = query.method;
  }

  const [payments, total, totalPaidAgg] = await Promise.all([
    Payment.find(filter)
      .populate("customer", "firstName lastName phone")
      .populate("provider", "businessName")
      .populate("booking", "bookingNumber")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments(filter),
    Payment.aggregate([
      { $match: { status: PAYMENT_STATUSES.PAID } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  return {
    payments,
    summary: {
      totalPaidAmount: totalPaidAgg[0]?.total || 0,
    },
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * 5. Review Moderation
 */
const getAllReviews = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = {};
  if (query.status && Object.values(REVIEW_STATUS).includes(query.status)) {
    filter.status = query.status;
  }

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate("customer", "firstName lastName email")
      .populate("provider", "businessName")
      .populate("booking", "bookingNumber")
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

const moderateReview = async (adminUser, reviewId, { status, moderationNotes }) => {
  const adminId = getAuthenticatedUserId(adminUser);

  if (!mongoose.isValidObjectId(reviewId)) {
    throw new AppError("Invalid review ID", 400, "INVALID_ID");
  }

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new AppError("Review not found", 404, "REVIEW_NOT_FOUND");
  }

  review.status = status;
  review.moderatedBy = adminId;
  review.moderatedAt = new Date();
  review.moderationNotes = moderationNotes || "";

  await review.save();

  // Recalculate provider stats (in case review was hidden or reinstated)
  await updateProviderReviewStats(review.provider);

  return Review.findById(review._id)
    .populate("customer", "firstName lastName")
    .populate("provider", "businessName")
    .populate("moderatedBy", "firstName lastName")
    .lean();
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  getUserDetail,
  updateUserStatus,
  getAllBookings,
  getAllPayments,
  getAllReviews,
  moderateReview,
};
