const mongoose = require("mongoose");

const PROVIDER_VERIFICATION_STATUS = {
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED",
};

const KYC_STATUS = {
  NOT_SUBMITTED: "NOT_SUBMITTED",
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
};

const providerSchema = new mongoose.Schema(
  {
    // User relationship
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Provider user is required"],
      unique: true,
      index: true,
    },

    // Provider profile
    businessName: {
      type: String,
      trim: true,
      maxlength: 150,
      default: null,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },

    experienceYears: {
      type: Number,
      min: 0,
      max: 80,
      default: 0,
    },

    profileImage: {
      type: String,
      trim: true,
      default: null,
    },

    // Service areas
    serviceAreas: [
      {
        type: String,
        trim: true,
        maxlength: 100,
      },
    ],

    // Provider location
    //
    // GeoJSON Point:
    // coordinates = [longitude, latitude]
    //
    // Example:
    // [87.2833, 26.6667]
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },

      coordinates: {
        type: [Number],
        default: undefined,

        validate: {
          validator: function (value) {
            if (!value) {
              return true;
            }

            if (!Array.isArray(value) || value.length !== 2) {
              return false;
            }

            const [longitude, latitude] = value;

            return (
              Number.isFinite(longitude) &&
              Number.isFinite(latitude) &&
              longitude >= -180 &&
              longitude <= 180 &&
              latitude >= -90 &&
              latitude <= 90
            );
          },

          message: "Location coordinates must be [longitude, latitude]",
        },
      },

      address: {
        type: String,
        trim: true,
        maxlength: 300,
        default: null,
      },
    },

    // Provider availability
    availability: {
      monday: {
        enabled: {
          type: Boolean,
          default: true,
        },

        startTime: {
          type: String,
          default: "09:00",
        },

        endTime: {
          type: String,
          default: "18:00",
        },
      },

      tuesday: {
        enabled: {
          type: Boolean,
          default: true,
        },

        startTime: {
          type: String,
          default: "09:00",
        },

        endTime: {
          type: String,
          default: "18:00",
        },
      },

      wednesday: {
        enabled: {
          type: Boolean,
          default: true,
        },

        startTime: {
          type: String,
          default: "09:00",
        },

        endTime: {
          type: String,
          default: "18:00",
        },
      },

      thursday: {
        enabled: {
          type: Boolean,
          default: true,
        },

        startTime: {
          type: String,
          default: "09:00",
        },

        endTime: {
          type: String,
          default: "18:00",
        },
      },

      friday: {
        enabled: {
          type: Boolean,
          default: true,
        },

        startTime: {
          type: String,
          default: "09:00",
        },

        endTime: {
          type: String,
          default: "18:00",
        },
      },

      saturday: {
        enabled: {
          type: Boolean,
          default: true,
        },

        startTime: {
          type: String,
          default: "09:00",
        },

        endTime: {
          type: String,
          default: "18:00",
        },
      },

      sunday: {
        enabled: {
          type: Boolean,
          default: false,
        },

        startTime: {
          type: String,
          default: "09:00",
        },

        endTime: {
          type: String,
          default: "18:00",
        },
      },
    },

    // Provider verification
    verificationStatus: {
      type: String,
      enum: Object.values(PROVIDER_VERIFICATION_STATUS),
      default: PROVIDER_VERIFICATION_STATUS.PENDING,
      index: true,
    },

    verificationReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // KYC
    kyc: {
      status: {
        type: String,
        enum: Object.values(KYC_STATUS),
        default: KYC_STATUS.NOT_SUBMITTED,
      },

      documentType: {
        type: String,
        enum: ["CITIZENSHIP", "PASSPORT", "DRIVING_LICENSE", "OTHER"],
        default: null,
      },

      documentUrl: {
        type: String,
        trim: true,
        default: null,
      },

      documentPublicId: {
        type: String,
        trim: true,
        default: null,
      },

      submittedAt: {
        type: Date,
        default: null,
      },

      reviewedAt: {
        type: Date,
        default: null,
      },

      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      rejectionReason: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: null,
      },
    },

    // Provider statistics
    stats: {
      averageRating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0,
      },

      totalReviews: {
        type: Number,
        min: 0,
        default: 0,
      },

      completedJobs: {
        type: Number,
        min: 0,
        default: 0,
      },

      responseRate: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

providerSchema.pre("validate", function (next) {
  if (Array.isArray(this.serviceAreas)) {
    this.serviceAreas = this.serviceAreas
      .map((area) =>
        typeof area === "string" ? area.trim() : area,
      )
      .filter(
        (area) => typeof area === "string" && area.length > 0,
      );
  }

  if (
    this.location &&
    typeof this.location === "object" &&
    !Array.isArray(this.location)
  ) {
    const { type, coordinates } = this.location;

    if (type && type !== "Point") {
      this.invalidate(
        "location.type",
        "Provider location type must be Point",
      );
    }

    if (
      coordinates !== undefined &&
      coordinates !== null
    ) {
      if (!Array.isArray(coordinates) || coordinates.length !== 2) {
        this.invalidate(
          "location.coordinates",
          "Location coordinates must be [longitude, latitude]",
        );
      } else {
        const [longitude, latitude] = coordinates.map(Number);

        if (
          !Number.isFinite(longitude) ||
          !Number.isFinite(latitude) ||
          longitude < -180 ||
          longitude > 180 ||
          latitude < -90 ||
          latitude > 90
        ) {
          this.invalidate(
            "location.coordinates",
            "Location coordinates must be [longitude, latitude] within valid ranges",
          );
        }

        this.location.type = "Point";
        this.location.coordinates = [longitude, latitude];
      }
    }
  }

  next();
});

// Indexes

/**
 * Provider verification + rating
 *
 * Helps find verified providers and sort them by rating.
 */
providerSchema.index({
  verificationStatus: 1,
  "stats.averageRating": -1,
});

/**
 * Service area search
 */
providerSchema.index({
  serviceAreas: 1,
});

/**
 * Geospatial index
 *
 * Required for MongoDB geospatial queries such as:
 *
 * $near
 * $geoNear
 * $maxDistance
 */
providerSchema.index({
  location: "2dsphere",
});

// Model export
module.exports = {
  Provider: mongoose.model("Provider", providerSchema),

  PROVIDER_VERIFICATION_STATUS,

  KYC_STATUS,
};
