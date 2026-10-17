const { z } = require("zod");

// Common validators
const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

// Time validator
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
};

// Availability
const availabilityDaySchema = z
  .object({
    enabled: z.boolean().optional(),

    startTime: z
      .string()
      .regex(timeRegex, "Invalid start time")
      .optional(),

    endTime: z
      .string()
      .regex(timeRegex, "Invalid end time")
      .optional(),
  })
  .superRefine((day, ctx) => {
    // If both times are provided, end time must be after start time.
    if (day.startTime && day.endTime) {
      const start = timeToMinutes(day.startTime);
      const end = timeToMinutes(day.endTime);

      if (end <= start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endTime"],
          message: "End time must be after start time",
        });
      }
    }

    // If availability is enabled, both start and end times should exist.
    if (
      day.enabled === true &&
      (!day.startTime || !day.endTime)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startTime"],
        message:
          "Start time and end time are required when availability is enabled",
      });
    }
  })
  .optional();

const availabilitySchema = z
  .object({
    monday: availabilityDaySchema,
    tuesday: availabilityDaySchema,
    wednesday: availabilityDaySchema,
    thursday: availabilityDaySchema,
    friday: availabilityDaySchema,
    saturday: availabilityDaySchema,
    sunday: availabilityDaySchema,
  })
  .optional();

// Location
// GeoJSON Point
//
// IMPORTANT:
// coordinates must always be:
// [longitude, latitude]
//
// Example:
// [87.2833, 26.6667]
//
// NOT:
// [26.6667, 87.2833]

const locationSchema = z
  .object({
    type: z.literal("Point").default("Point"),

    coordinates: z
      .array(z.coerce.number())
      .length(
        2,
        "Coordinates must contain longitude and latitude"
      )
      .refine(
        ([longitude, latitude]) =>
          longitude >= -180 &&
          longitude <= 180 &&
          latitude >= -90 &&
          latitude <= 90,
        {
          message: "Invalid longitude or latitude",
        }
      )
      .refine(
        ([longitude, latitude]) =>
          Number.isFinite(longitude) && Number.isFinite(latitude),
        {
          message: "Longitude and latitude must be numeric",
        }
      ),

    address: z
      .string()
      .trim()
      .max(300)
      .nullish()
      .optional(),
  })
  .refine(
    (value) => !value || Array.isArray(value.coordinates),
    {
      message: "Location coordinates are required when location is provided",
      path: ["coordinates"],
    }
  )
  .optional();

// Location filter validator
// Latitude and longitude must be provided together.

const discoveryLocationSchema = z
  .object({
    latitude: z.coerce
      .number()
      .min(-90)
      .max(90)
      .optional(),

    longitude: z.coerce
      .number()
      .min(-180)
      .max(180)
      .optional(),

    maxDistanceKm: z.coerce
      .number()
      .min(1)
      .max(100)
      .default(50),
  })
  .superRefine((data, ctx) => {
    const hasLatitude = data.latitude !== undefined;
    const hasLongitude = data.longitude !== undefined;

    // Both must exist if location search is used.
    if (hasLatitude !== hasLongitude) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["latitude"],
        message:
          "Latitude and longitude must be provided together",
      });
    }
  });

// Create provider profile
const createProviderProfileSchema = z.object({
  body: z.object({
    businessName: z
      .string()
      .trim()
      .min(2, "Business name must contain at least 2 characters")
      .max(150)
      .optional(),

    bio: z
      .string()
      .trim()
      .max(2000)
      .optional(),

    experienceYears: z
      .coerce
      .number()
      .min(0)
      .max(80)
      .optional(),

    profileImage: z
      .string()
      .trim()
      .url("Invalid profile image URL")
      .optional(),

    serviceAreas: z
      .array(
        z
          .string()
          .trim()
          .min(2)
          .max(100)
      )
      .max(20)
      .optional(),

    availability: availabilitySchema,

    location: locationSchema,
  }),

  params: z.object({}).optional(),

  query: z.object({}).optional(),
});

// Update provider profile
const updateProviderProfileSchema = z.object({
  body: createProviderProfileSchema.shape.body
    .partial()
    .extend({
      serviceAreas: z
        .array(
          z
            .string()
            .trim()
            .min(2)
            .max(100)
        )
        .max(20)
        .optional(),

      location: locationSchema,
    }),

  params: z.object({}).optional(),

  query: z.object({}).optional(),
});

// Provider discovery
const providerDiscoverySchema = z.object({
  body: z.object({}).optional(),

  params: z.object({}).optional(),

  query: z
    .object({
      // Service filter
      serviceId: z
        .string()
        .regex(objectIdRegex, "Invalid service ID")
        .optional(),

      // Service area filter
      serviceArea: z
        .string()
        .trim()
        .max(100)
        .optional(),

      // Search
      search: z
        .string()
        .trim()
        .max(100)
        .optional(),

      // Rating filter
      minRating: z
        .coerce
        .number()
        .min(0)
        .max(5)
        .optional(),

      // Price filter
      maxPrice: z
        .coerce
        .number()
        .min(0)
        .optional(),

      // Customer location
      latitude: z.coerce
        .number()
        .min(-90)
        .max(90)
        .optional(),

      longitude: z.coerce
        .number()
        .min(-180)
        .max(180)
        .optional(),

      // Maximum search distance. Default = 50 KM
      maxDistanceKm: z.coerce
        .number()
        .min(1)
        .max(100)
        .default(50),

      // Smart matching
      sortBy: z
        .enum([
          "SMART_MATCH",
          "RATING",
          "PRICE_LOW",
          "PRICE_HIGH",
          "DISTANCE",
          "EXPERIENCE",
        ])
        .default("SMART_MATCH"),

      // Pagination
      page: z.coerce
        .number()
        .int()
        .min(1)
        .default(1),

      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(50)
        .default(10),
    })
    .superRefine((data, ctx) => {
      // Latitude and longitude must be provided together.
      const hasLatitude = data.latitude !== undefined;
      const hasLongitude = data.longitude !== undefined;

      if (hasLatitude !== hasLongitude) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["latitude"],
          message:
            "Latitude and longitude must be provided together",
        });
      }

      // Distance sorting only makes sense when customer coordinates are provided.
      if (
        data.sortBy === "DISTANCE" &&
        (!hasLatitude || !hasLongitude)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sortBy"],
          message:
            "Latitude and longitude are required when sorting by distance",
        });
      }
    }),
});

module.exports = {
  createProviderProfileSchema,
  updateProviderProfileSchema,
  providerDiscoverySchema,
  locationSchema,
};