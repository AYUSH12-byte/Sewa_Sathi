const asyncHandler = require("../utils/asyncHandler");
const { createdResponse, successResponse } = require("../utils/apiResponse");
const {
  createComplaint,
  getMyComplaints,
  getComplaintById,
  adminListComplaints,
  adminResolveComplaint,
} = require("../services/complaint.service");

/**
 * Submit a complaint.
 */
const create = asyncHandler(async (req, res) => {
  const complaint = await createComplaint(req.user, req.validated.body);

  return createdResponse({
    res,
    message: "Complaint filed successfully.",
    data: { complaint },
  });
});

/**
 * Get complaints filed by the authenticated user.
 */
const getMy = asyncHandler(async (req, res) => {
  const result = await getMyComplaints(req.user, req.validated.query);

  return successResponse({
    res,
    message: "Your complaints retrieved successfully.",
    data: result,
  });
});

/**
 * Get details of a single complaint.
 */
const getOne = asyncHandler(async (req, res) => {
  const complaint = await getComplaintById(req.user, req.validated.params.id);

  return successResponse({
    res,
    message: "Complaint details retrieved successfully.",
    data: { complaint },
  });
});

/**
 * Admin: List all complaints.
 */
const adminList = asyncHandler(async (req, res) => {
  const result = await adminListComplaints(req.query);

  return successResponse({
    res,
    message: "All complaints retrieved successfully.",
    data: result,
  });
});

/**
 * Admin: Update/Resolve complaint.
 */
const adminResolve = asyncHandler(async (req, res) => {
  const complaint = await adminResolveComplaint(
    req.user,
    req.validated.params.id,
    req.validated.body
  );

  return successResponse({
    res,
    message: "Complaint status updated successfully.",
    data: { complaint },
  });
});

module.exports = {
  create,
  getMy,
  getOne,
  adminList,
  adminResolve,
};
