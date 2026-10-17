const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/apiResponse");
const {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require("../services/notification.service");

/**
 * List notifications for the authenticated user.
 */
const list = asyncHandler(async (req, res) => {
  const result = await getUserNotifications(req.user, req.validated.query);

  return successResponse({
    res,
    message: "Notifications retrieved successfully.",
    data: result,
  });
});

/**
 * Mark a single notification as read.
 */
const markRead = asyncHandler(async (req, res) => {
  const notification = await markNotificationAsRead(
    req.user,
    req.validated.params.id
  );

  return successResponse({
    res,
    message: "Notification marked as read.",
    data: { notification },
  });
});

/**
 * Mark all notifications as read.
 */
const markAllRead = asyncHandler(async (req, res) => {
  const result = await markAllNotificationsAsRead(req.user);

  return successResponse({
    res,
    message: "All notifications marked as read.",
    data: result,
  });
});

module.exports = {
  list,
  markRead,
  markAllRead,
};
