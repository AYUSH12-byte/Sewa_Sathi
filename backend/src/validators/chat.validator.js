const { z } = require("zod");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const startConversationSchema = z.object({
  params: z.object({}),
  body: z
    .object({
      bookingId: z.string().regex(objectIdRegex, "Invalid booking ID").optional(),
      recipientId: z.string().regex(objectIdRegex, "Invalid recipient ID").optional(),
    })
    .refine((data) => data.bookingId || data.recipientId, {
      message: "Either bookingId or recipientId must be provided",
      path: ["bookingId"],
    }),
  query: z.object({}),
});

const conversationIdSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid conversation ID"),
  }),
  body: z.object({}),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

const sendMessageSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid conversation ID"),
  }),
  body: z.object({
    text: z
      .string({ required_error: "Message text is required" })
      .trim()
      .min(1, "Message text cannot be empty")
      .max(2000, "Message text cannot exceed 2000 characters"),
  }),
  query: z.object({}),
});

const chatListSchema = z.object({
  params: z.object({}),
  body: z.object({}),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

module.exports = {
  startConversationSchema,
  conversationIdSchema,
  sendMessageSchema,
  chatListSchema,
};
