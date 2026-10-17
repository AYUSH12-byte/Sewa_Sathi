const crypto = require("crypto");
const mongoose = require("mongoose");
const { Complaint, COMPLAINT_STATUS } = require("../models/Complaint");
const { Booking } = require("../models/Booking");
const { Provider } = require("../models/Provider");
const { USER_ROLES } = require("../models/User");
const AppError = require("../utils/AppError");

const generateComplaintNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `SFC-${date}-${suffix}`;
};

const getAuthenticatedUserId = (user) => {
  const userId = user?.id || user?._id || user?.sub;

  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw new AppError(
      "Invalid authenticated user",
      401,
      "INVALID_AUTHENTICATED_USER"
    );
  }

  return userId;
};

/**
 * File a complaint about a booking, service, or user.
 */
const createComplaint = async (user, data) => {
  const userId = getAuthenticatedUserId(user);

  let againstUserId = null;
  let bookingId = null;

  if (data.bookingId) {
    if (!mongoose.isValidObjectId(data.bookingId)) {
      throw new AppError("Invalid booking ID", 400, "INVALID_ID");
    }

    const booking = await Booking.findById(data.bookingId);
    if (!booking) {
      throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
    }

    bookingId = booking._id;

    // Set againstUser based on who filed
    if (user.role === USER_ROLES.CUSTOMER) {
      if (String(booking.customer) !== String(userId)) {
        throw new AppError(
          "You can only file complaints for your own bookings",
          403,
          "COMPLAINT_ACCESS_DENIED"
        );
      }
      const provider = await Provider.findById(booking.provider).select("user");
      if (provider) {
        againstUserId = provider.user;
      }
    } else if (user.role === USER_ROLES.PROVIDER) {
      const provider = await Provider.findOne({ user: userId }).select("_id");
      if (!provider || String(booking.provider) !== String(provider._id)) {
        throw new AppError(
          "You can only file complaints for your own assigned bookings",
          403,
          "COMPLAINT_ACCESS_DENIED"
        );
      }
      againstUserId = booking.customer;
    }
  }

  const complaintNumber = generateComplaintNumber();

  const complaint = await Complaint.create({
    complaintNumber,
    reporter: userId,
    reporterRole: user.role,
    booking: bookingId,
    againstUser: againstUserId || (data.againstUserId && mongoose.isValidObjectId(data.againstUserId) ? data.againstUserId : null),
    type: data.type,
    subject: data.subject,
    description: data.description,
    status: COMPLAINT_STATUS.PENDING,
  });

  return Complaint.findById(complaint._id)
    .populate("reporter", "firstName lastName email phone")
    .populate("againstUser", "firstName lastName email phone")
    .populate("booking", "bookingNumber status")
    .lean();
};

/**
 * Retrieve complaints filed by the current user.
 */
const getMyComplaints = async (user, query = {}) => {
  const userId = getAuthenticatedUserId(user);

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = { reporter: userId };
  if (query.status && Object.values(COMPLAINT_STATUS).includes(query.status)) {
    filter.status = query.status;
  }

  const [complaints, total] = await Promise.all([
    Complaint.find(filter)
      .populate("againstUser", "firstName lastName")
      .populate("booking", "bookingNumber")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Complaint.countDocuments(filter),
  ]);

  return {
    complaints,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Get details of a single complaint for the reporter or an administrator.
 */
const getComplaintById = async (user, complaintId) => {
  const userId = getAuthenticatedUserId(user);

  if (!mongoose.isValidObjectId(complaintId)) {
    throw new AppError("Invalid complaint ID", 400, "INVALID_ID");
  }

  const complaint = await Complaint.findById(complaintId)
    .populate("reporter", "firstName lastName email phone")
    .populate("againstUser", "firstName lastName email phone")
    .populate("booking", "bookingNumber status scheduledDate")
    .populate("resolution.resolvedBy", "firstName lastName")
    .lean();

  if (!complaint) {
    throw new AppError("Complaint not found", 404, "COMPLAINT_NOT_FOUND");
  }

  if (
    user.role !== USER_ROLES.ADMIN &&
    String(complaint.reporter._id) !== String(userId)
  ) {
    throw new AppError(
      "You do not have permission to view this complaint",
      403,
      "FORBIDDEN"
    );
  }

  return complaint;
};

/**
 * Admin: List all complaints with filtering and pagination.
 */
const adminListComplaints = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = {};
  if (query.status && Object.values(COMPLAINT_STATUS).includes(query.status)) {
    filter.status = query.status;
  }
  if (query.type) {
    filter.type = query.type;
  }

  const [complaints, total] = await Promise.all([
    Complaint.find(filter)
      .populate("reporter", "firstName lastName email phone role")
      .populate("againstUser", "firstName lastName email phone")
      .populate("booking", "bookingNumber status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Complaint.countDocuments(filter),
  ]);

  return {
    complaints,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Admin: Resolve, update status, or dismiss a complaint.
 */
const adminResolveComplaint = async (adminUser, complaintId, { status, notes, actionTaken }) => {
  const adminId = getAuthenticatedUserId(adminUser);

  if (!mongoose.isValidObjectId(complaintId)) {
    throw new AppError("Invalid complaint ID", 400, "INVALID_ID");
  }

  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new AppError("Complaint not found", 404, "COMPLAINT_NOT_FOUND");
  }

  complaint.status = status;
  complaint.resolution = {
    resolvedBy: adminId,
    resolvedAt: new Date(),
    notes: notes || "",
    actionTaken: actionTaken || "",
  };

  await complaint.save();

  return Complaint.findById(complaint._id)
    .populate("reporter", "firstName lastName email")
    .populate("againstUser", "firstName lastName email")
    .populate("resolution.resolvedBy", "firstName lastName")
    .lean();
};

module.exports = {
  createComplaint,
  getMyComplaints,
  getComplaintById,
  adminListComplaints,
  adminResolveComplaint,
};
