
const express = require("express");

const {
  authenticate,
  authorize,
} = require("../middleware/auth");

const validate = require("../middleware/validate");

const {
  create,
  getOne,
} = require("../controllers/payment.controller");

const {
  bookingPaymentSchema,
  paymentIdSchema,
} = require("../validators/payment.validator");

const router = express.Router();

router.use(authenticate);

router.post(
  "/bookings/:bookingId",
  authorize("CUSTOMER"),
  validate(bookingPaymentSchema),
  create
);

router.get(
  "/:id",
  authorize("CUSTOMER", "PROVIDER"),
  validate(paymentIdSchema),
  getOne
);

module.exports = router;
