const express = require("express");
const router = express.Router();

const { authenticate, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  create,
  getByProvider,
  getMine,
  getOne,
} = require("../controllers/review.controller");
const {
  createReviewSchema,
  getProviderReviewsSchema,
  getMyReviewsSchema,
  reviewIdSchema,
} = require("../validators/review.validator");

// Public: Get reviews for a provider
router.get(
  "/provider/:providerId",
  validate(getProviderReviewsSchema),
  getByProvider
);

// Customer: Get my reviews
router.get(
  "/me",
  authenticate,
  authorize("CUSTOMER"),
  validate(getMyReviewsSchema),
  getMine
);

// Customer: Submit review for a booking
router.post(
  "/bookings/:bookingId",
  authenticate,
  authorize("CUSTOMER"),
  validate(createReviewSchema),
  create
);

// Public / Authenticated: Get a single review
router.get("/:id", validate(reviewIdSchema), getOne);

module.exports = router;
