const { z } = require("zod");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const bookingPaymentSchema = z.object({
  params: z.object({
    bookingId: z.string().regex(objectIdRegex, "Invalid booking ID"),
  }),

  body: z.object({
    method: z.enum(["CASH", "ESEWA"]),
  }),

  query: z.object({}),
});

const paymentIdSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid payment ID"),
  }),

  body: z.object({}),
  query: z.object({}),
});

module.exports = {
  bookingPaymentSchema,
  paymentIdSchema,
};
