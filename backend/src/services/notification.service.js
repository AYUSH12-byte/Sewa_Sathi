const mongoose = require("mongoose");
const { Notification, NOTIFICATION_TYPE } = require("../models/Notification");
const AppError = require("../utils/AppError");

const getAuthenticatedUserId = (user) => {
  const userId = user?.id || user?._id || user?.sub;
  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw new AppError("Invalid authenticated user", 401, "INVALID_AUTHENTICATED_USER");
  }
  return userId;
};

/**
 * Create a notification for a user.
 */
const createNotification = async ({
  recipient,
  title,
  message,
  type = NOTIFICATION_TYPE.SYSTEM,
  relatedId = null,
  relatedType = null,
}) => {
  if (!mongoose.isValidObjectId(recipient)) {
    return null;
  }

  return Notification.create({
    recipient,
    title,
    message,
    type,
    relatedId,
    relatedType,
  });
};

/**
 * List paginated notifications for the authenticated user with unread badge count.
 */
const getUserNotifications = async (user, query = {}) => {
  const userId = getAuthenticatedUserId(user);

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const filter = { recipient: userId };
  if (query.unreadOnly === "true" || query.unreadOnly === true) {
    filter.read = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: userId, read: false }),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Mark a single notification as read.
 */
const markNotificationAsRead = async (user, notificationId) => {
  const userId = getAuthenticatedUserId(user);

  if (!mongoose.isValidObjectId(notificationId)) {
    throw new AppError("Invalid notification ID", 400, "INVALID_ID");
  }

  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      recipient: userId,
    },
    {
      $set: {
        read: true,
        readAt: new Date(),
      },
    },
    { new: true }
  );

  if (!notification) {
    throw new AppError("Notification not found", 404, "NOTIFICATION_NOT_FOUND");
  }

  return notification;
};

/**
 * Mark all notifications for the user as read.
 */
const markAllNotificationsAsRead = async (user) => {
  const userId = getAuthenticatedUserId(user);

  await Notification.updateMany(
    {
      recipient: userId,
      read: false,
    },
    {
      $set: {
        read: true,
        readAt: new Date(),
      },
    }
  );

  return { success: true };
};

module.exports = {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
