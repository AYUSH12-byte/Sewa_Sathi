const { z } = require("zod");
const { COMPLAINT_TYPE, COMPLAINT_STATUS } = require("../models/Complaint");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createComplaintSchema = z.object({
  params: z.object({}),
  body: z.object({
    bookingId: z
      .string()
      .regex(objectIdRegex, "Invalid booking ID")
      .optional(),
    againstUserId: z
      .string()
      .regex(objectIdRegex, "Invalid user ID")
      .optional(),
    type: z.enum(Object.values(COMPLAINT_TYPE), {
      required_error: "Complaint type is required",
    }),
    subject: z
      .string({ required_error: "Subject is required" })
      .trim()
      .min(3, "Subject must be at least 3 characters")
      .max(200, "Subject cannot exceed 200 characters"),
    description: z
      .string({ required_error: "Description is required" })
      .trim()
      .min(10, "Description must be at least 10 characters")
      .max(2000, "Description cannot exceed 2000 characters"),
  }),
  query: z.object({}),
});

const getMyComplaintsSchema = z.object({
  params: z.object({}),
  body: z.object({}),
  query: z.object({
    status: z.enum(Object.values(COMPLAINT_STATUS)).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

const complaintIdSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid complaint ID"),
  }),
  body: z.object({}),
  query: z.object({}),
});

const resolveComplaintSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid complaint ID"),
  }),
  body: z.object({
    status: z.enum([
      COMPLAINT_STATUS.UNDER_REVIEW,
      COMPLAINT_STATUS.RESOLVED,
      COMPLAINT_STATUS.DISMISSED,
    ], {
      required_error: "Status is required",
    }),
    notes: z.string().trim().max(2000).optional().default(""),
    actionTaken: z.string().trim().max(500).optional().default(""),
  }),
  query: z.object({}),
});

module.exports = {
  createComplaintSchema,
  getMyComplaintsSchema,
  complaintIdSchema,
  resolveComplaintSchema,
};
