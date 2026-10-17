const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  list,
  markRead,
  markAllRead,
} = require("../controllers/notification.controller");
const {
  notificationListSchema,
  notificationIdSchema,
} = require("../validators/notification.validator");

// All notification endpoints require authentication
router.use(authenticate);

// List notifications with optional unread filter and pagination
router.get("/", validate(notificationListSchema), list);

// Mark all notifications as read (keep before :id route)
router.patch("/read-all", markAllRead);

// Mark a specific notification as read
router.patch("/:id/read", validate(notificationIdSchema), markRead);

module.exports = router;
