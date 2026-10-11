const { z } = require("zod");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const objectIdSchema = z.string().regex(objectIdRegex, "Invalid ID");

const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

// Create booking
const createBookingSchema = z.object({
  body: z.object({
    providerId: objectIdSchema,

    providerServiceId: objectIdSchema,

    scheduledDate: z.string().datetime(),

    startTime: z
      .string()
      .regex(timeRegex, "Start time must be in HH:mm format"),

    endTime: z.string().regex(timeRegex, "End time must be in HH:mm format"),

    address: z.object({
      label: z.string().trim().max(100).optional(),

      fullAddress: z.string().trim().min(5).max(500),

      city: z.string().trim().max(100).optional(),

      district: z.string().trim().max(100).optional(),

      latitude: z.number().min(-90).max(90).optional(),

      longitude: z.number().min(-180).max(180).optional(),
    }),

    customerNote: z.string().trim().max(2000).optional(),

    quantity: z.number().int().min(1).default(1),
  }),

  params: z.object({}),

  query: z.object({}),
});

// Booking ID
const bookingIdSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),

  body: z.object({}),

  query: z.object({}),
});

// Reject booking
const rejectBookingSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),

  body: z.object({
    reason: z.string().trim().min(3).max(1000),
  }),

  query: z.object({}),
});

// Cancel booking
const cancelBookingSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),

  body: z.object({
    reason: z.string().trim().min(3).max(1000),
  }),

  query: z.object({}),
});

// List bookings
const listBookingsSchema = z.object({
  body: z.object({}),

  params: z.object({}),

  query: z.object({
    status: z.string().optional(),

    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
});


const updateJobStatusSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),

  body: z.object({
    status: z.enum([
      "SCHEDULED",
      "PROVIDER_ON_WAY",
      "IN_PROGRESS",
      "COMPLETED",
    ]),
  }),

  query: z.object({}),
});


module.exports = {
  createBookingSchema,
  bookingIdSchema,
  rejectBookingSchema,
  cancelBookingSchema,
  listBookingsSchema,
  updateJobStatusSchema,
};
