
const express = require("express");
const router = express.Router();

const { authenticate, authorize } = require("../middleware/auth");
const {
  create,
  getOne,
  verifyEsewa,
} = require("../controllers/payment.controller");

const validate = require("../middleware/validate");
const {
  bookingPaymentSchema,
  paymentIdSchema,
} = require("../validators/payment.validator");

// Require authentication for all payment endpoints.
router.use(authenticate);

// Create a payment for a booking.
// Supported methods: CASH and ESEWA.
router.post(
  "/bookings/:bookingId",
  authorize("CUSTOMER"),
  validate(bookingPaymentSchema),
  create
);

// Verify an eSewa transaction with the backend.
// Keep this route before GET "/:id" for clarity.
router.post(
  "/:id/verify",
  authorize("CUSTOMER"),
  validate(paymentIdSchema),
  verifyEsewa
);

// Get payment details.
router.get(
  "/:id",
  authorize("CUSTOMER", "PROVIDER"),
  validate(paymentIdSchema),
  getOne
);

module.exports = router;
