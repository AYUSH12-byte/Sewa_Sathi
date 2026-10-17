const { z } = require("zod");
const { USER_ROLES, USER_STATUS } = require("../models/User");
const { BOOKING_STATUS } = require("../models/Booking");
const { PAYMENT_STATUSES } = require("../models/Payment");
const { REVIEW_STATUS } = require("../models/Review");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const userListSchema = z.object({
  params: z.object({}),
  body: z.object({}),
  query: z.object({
    role: z.enum(Object.values(USER_ROLES)).optional(),
    status: z.enum(Object.values(USER_STATUS)).optional(),
    search: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

const userIdSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid user ID"),
  }),
  body: z.object({}),
  query: z.object({}),
});

const updateUserStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid user ID"),
  }),
  body: z.object({
    status: z.enum(Object.values(USER_STATUS), {
      required_error: "Status is required",
    }),
    reason: z.string().trim().max(500).optional().default(""),
  }),
  query: z.object({}),
});

const adminBookingListSchema = z.object({
  params: z.object({}),
  body: z.object({}),
  query: z.object({
    status: z.enum(Object.values(BOOKING_STATUS)).optional(),
    paymentStatus: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

const adminPaymentListSchema = z.object({
  params: z.object({}),
  body: z.object({}),
  query: z.object({
    status: z.enum(Object.values(PAYMENT_STATUSES)).optional(),
    method: z.enum(["CASH", "ESEWA"]).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

const adminReviewListSchema = z.object({
  params: z.object({}),
  body: z.object({}),
  query: z.object({
    status: z.enum(Object.values(REVIEW_STATUS)).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

const reviewModerationSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid review ID"),
  }),
  body: z.object({
    status: z.enum(Object.values(REVIEW_STATUS), {
      required_error: "Status is required",
    }),
    moderationNotes: z.string().trim().max(500).optional().default(""),
  }),
  query: z.object({}),
});

module.exports = {
  userListSchema,
  userIdSchema,
  updateUserStatusSchema,
  adminBookingListSchema,
  adminPaymentListSchema,
  adminReviewListSchema,
  reviewModerationSchema,
};
