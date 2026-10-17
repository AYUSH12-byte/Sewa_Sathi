const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/apiResponse");
const {
  getDashboardStats,
  getAllUsers,
  getUserDetail,
  updateUserStatus,
  getAllBookings,
  getAllPayments,
  getAllReviews,
  moderateReview,
} = require("../services/admin.service");

const getStats = asyncHandler(async (req, res) => {
  const stats = await getDashboardStats();

  return successResponse({
    res,
    message: "Admin dashboard statistics retrieved successfully.",
    data: stats,
  });
});

const getUsers = asyncHandler(async (req, res) => {
  const result = await getAllUsers(req.validated.query);

  return successResponse({
    res,
    message: "Users retrieved successfully.",
    data: result,
  });
});

const getUser = asyncHandler(async (req, res) => {
  const result = await getUserDetail(req.validated.params.id);

  return successResponse({
    res,
    message: "User details retrieved successfully.",
    data: result,
  });
});

const changeUserStatus = asyncHandler(async (req, res) => {
  const user = await updateUserStatus(
    req.user,
    req.validated.params.id,
    req.validated.body
  );

  return successResponse({
    res,
    message: "User status updated successfully.",
    data: { user },
  });
});

const getBookings = asyncHandler(async (req, res) => {
  const result = await getAllBookings(req.validated.query);

  return successResponse({
    res,
    message: "All bookings retrieved successfully.",
    data: result,
  });
});

const getPayments = asyncHandler(async (req, res) => {
  const result = await getAllPayments(req.validated.query);

  return successResponse({
    res,
    message: "Payments and revenue report retrieved successfully.",
    data: result,
  });
});

const getReviews = asyncHandler(async (req, res) => {
  const result = await getAllReviews(req.validated.query);

  return successResponse({
    res,
    message: "All reviews retrieved successfully.",
    data: result,
  });
});

const moderateReviewHandler = asyncHandler(async (req, res) => {
  const review = await moderateReview(
    req.user,
    req.validated.params.id,
    req.validated.body
  );

  return successResponse({
    res,
    message: "Review moderated successfully.",
    data: { review },
  });
});

module.exports = {
  getStats,
  getUsers,
  getUser,
  changeUserStatus,
  getBookings,
  getPayments,
  getReviews,
  moderateReviewHandler,
};
