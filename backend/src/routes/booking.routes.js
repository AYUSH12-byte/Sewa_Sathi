
const express = require("express");

const {
  authenticate,
  authorize,
} = require("../middleware/auth");

const validate = require("../middleware/validate");

const {
  create,
  list,
  getOne,
  accept,
  reject,
  cancel,
  updateJobStatus,
  getHistory,
} = require("../controllers/booking.controller");

const {
  createBookingSchema,
  bookingIdSchema,
  rejectBookingSchema,
  cancelBookingSchema,
  listBookingsSchema,
  updateJobStatusSchema,
} = require("../validators/booking.validator");

const router = express.Router();

// All booking endpoints require authentication.
router.use(authenticate);

// List bookings belonging to the authenticated customer or provider.
router.get(
  "/",
  authorize("CUSTOMER", "PROVIDER"),
  validate(listBookingsSchema),
  list
);

// Only customers can create bookings.
router.post(
  "/",
  authorize("CUSTOMER"),
  validate(createBookingSchema),
  create
);

// Provider job progress.
router.patch(
  "/:id/status",
  authorize("PROVIDER"),
  validate(updateJobStatusSchema),
  updateJobStatus
);

// Booking status history.
router.get(
  "/:id/history",
  authorize("CUSTOMER", "PROVIDER"),
  validate(bookingIdSchema),
  getHistory
);

// Provider accepts a booking.
router.patch(
  "/:id/accept",
  authorize("PROVIDER"),
  validate(bookingIdSchema),
  accept
);

// Provider rejects a booking.
router.patch(
  "/:id/reject",
  authorize("PROVIDER"),
  validate(rejectBookingSchema),
  reject
);

// Customer or assigned provider can cancel.
router.patch(
  "/:id/cancel",
  authorize("CUSTOMER", "PROVIDER"),
  validate(cancelBookingSchema),
  cancel
);

// Get a single booking.
// Keep this after the named routes for clarity.
router.get(
  "/:id",
  authorize("CUSTOMER", "PROVIDER"),
  validate(bookingIdSchema),
  getOne
);

module.exports = router;
