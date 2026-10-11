const express = require("express");

const { authenticate, authorize } = require("../middleware/auth");

const validate = require("../middleware/validate");

const {
  create,
  list,
  getOne,
  accept,
  reject,
  cancel,
} = require("../controllers/booking.controller");

const {
  createBookingSchema,
  bookingIdSchema,
  rejectBookingSchema,
  cancelBookingSchema,
  listBookingsSchema,
} = require("../validators/booking.validator");

const router = express.Router();

router.use(authenticate);

// Customer and provider booking endpoints
router.get(
  "/",
  authorize("CUSTOMER", "PROVIDER"),
  validate(listBookingsSchema),
  list,
);

router.post("/", authorize("CUSTOMER"), validate(createBookingSchema), create);

router.patch(
  "/:id/status",
  authorize("PROVIDER"),
  validate(updateJobStatusSchema),
  updateJobStatus,
);

// Provider actions
router.patch(
  "/:id/accept",
  authorize("PROVIDER"),
  validate(bookingIdSchema),
  accept,
);

router.patch(
  "/:id/reject",
  authorize("PROVIDER"),
  validate(rejectBookingSchema),
  reject,
);

// Customer or assigned provider can cancel
router.patch(
  "/:id/cancel",
  authorize("CUSTOMER", "PROVIDER"),
  validate(cancelBookingSchema),
  cancel,
);

// Keep the parameterized detail route after the named action routes
router.get(
  "/:id",
  authorize("CUSTOMER", "PROVIDER"),
  validate(bookingIdSchema),
  getOne,
);

module.exports = router;
