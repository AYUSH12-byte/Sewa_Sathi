const express = require("express");
const router = express.Router();

const { authenticate, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  getStats,
  getUsers,
  getUser,
  changeUserStatus,
  getBookings,
  getPayments,
  getReviews,
  moderateReviewHandler,
} = require("../controllers/admin.controller");

const {
  userListSchema,
  userIdSchema,
  updateUserStatusSchema,
  adminBookingListSchema,
  adminPaymentListSchema,
  adminReviewListSchema,
  reviewModerationSchema,
} = require("../validators/admin.validator");

// All admin routes require ADMIN role
router.use(authenticate, authorize("ADMIN"));

// Dashboard statistics
router.get("/dashboard/stats", getStats);

// User management
router.get("/users", validate(userListSchema), getUsers);
router.get("/users/:id", validate(userIdSchema), getUser);
router.patch("/users/:id/status", validate(updateUserStatusSchema), changeUserStatus);

// Booking oversight
router.get("/bookings", validate(adminBookingListSchema), getBookings);

// Payment oversight & revenue
router.get("/payments", validate(adminPaymentListSchema), getPayments);

// Review moderation
router.get("/reviews", validate(adminReviewListSchema), getReviews);
router.patch("/reviews/:id/moderate", validate(reviewModerationSchema), moderateReviewHandler);

module.exports = router;
