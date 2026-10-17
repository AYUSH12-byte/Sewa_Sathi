const { z } = require("zod");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const notificationListSchema = z.object({
  params: z.object({}),
  body: z.object({}),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    unreadOnly: z.string().optional(),
  }),
});

const notificationIdSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid notification ID"),
  }),
  body: z.object({}),
  query: z.object({}),
});

module.exports = {
  notificationListSchema,
  notificationIdSchema,
};
