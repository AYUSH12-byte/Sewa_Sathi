const asyncHandler = require("../utils/asyncHandler");
const { createdResponse, successResponse } = require("../utils/apiResponse");
const {
  createReview,
  getProviderReviews,
  getMyReviews,
  getReviewById,
} = require("../services/review.service");

/**
 * Submit a review for a booking.
 */
const create = asyncHandler(async (req, res) => {
  const review = await createReview(req.user, {
    bookingId: req.validated.params.bookingId,
    rating: req.validated.body.rating,
    comment: req.validated.body.comment,
  });

  return createdResponse({
    res,
    message: "Review submitted successfully.",
    data: { review },
  });
});

/**
 * Get public reviews for a provider.
 */
const getByProvider = asyncHandler(async (req, res) => {
  const result = await getProviderReviews(
    req.validated.params.providerId,
    req.validated.query
  );

  return successResponse({
    res,
    message: "Provider reviews retrieved successfully.",
    data: result,
  });
});

/**
 * Get reviews written by the logged-in customer.
 */
const getMine = asyncHandler(async (req, res) => {
  const result = await getMyReviews(req.user, req.validated.query);

  return successResponse({
    res,
    message: "My reviews retrieved successfully.",
    data: result,
  });
});

/**
 * Get a review by its ID.
 */
const getOne = asyncHandler(async (req, res) => {
  const review = await getReviewById(req.validated.params.id);

  return successResponse({
    res,
    message: "Review retrieved successfully.",
    data: { review },
  });
});

module.exports = {
  create,
  getByProvider,
  getMine,
  getOne,
};
