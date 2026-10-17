const express = require("express");
const router = express.Router();

const { authenticate, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  create,
  getMy,
  getOne,
  adminList,
  adminResolve,
} = require("../controllers/complaint.controller");
const {
  createComplaintSchema,
  getMyComplaintsSchema,
  complaintIdSchema,
  resolveComplaintSchema,
} = require("../validators/complaint.validator");

// All complaint routes require authentication
router.use(authenticate);

// File a complaint (Customer or Provider)
router.post(
  "/",
  authorize("CUSTOMER", "PROVIDER"),
  validate(createComplaintSchema),
  create
);

// View complaints filed by current user
router.get(
  "/me",
  authorize("CUSTOMER", "PROVIDER"),
  validate(getMyComplaintsSchema),
  getMy
);

// Admin: List all complaints
router.get("/admin", authorize("ADMIN"), adminList);

// Admin: Resolve or update complaint status
router.patch(
  "/admin/:id/resolve",
  authorize("ADMIN"),
  validate(resolveComplaintSchema),
  adminResolve
);

// View a single complaint (Reporter or Admin)
router.get("/:id", validate(complaintIdSchema), getOne);

module.exports = router;
