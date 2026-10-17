const { z } = require("zod");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createReviewSchema = z.object({
  params: z.object({
    bookingId: z.string().regex(objectIdRegex, "Invalid booking ID"),
  }),
  body: z.object({
    rating: z
      .number({
        required_error: "Rating is required",
        invalid_type_error: "Rating must be a number",
      })
      .int("Rating must be an integer")
      .min(1, "Rating must be between 1 and 5")
      .max(5, "Rating must be between 1 and 5"),
    comment: z
      .string()
      .trim()
      .max(1000, "Comment cannot exceed 1000 characters")
      .optional()
      .default(""),
  }),
  query: z.object({}),
});

const getProviderReviewsSchema = z.object({
  params: z.object({
    providerId: z.string().regex(objectIdRegex, "Invalid provider ID"),
  }),
  body: z.object({}),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

const getMyReviewsSchema = z.object({
  params: z.object({}),
  body: z.object({}),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

const reviewIdSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid review ID"),
  }),
  body: z.object({}),
  query: z.object({}),
});

module.exports = {
  createReviewSchema,
  getProviderReviewsSchema,
  getMyReviewsSchema,
  reviewIdSchema,
};
