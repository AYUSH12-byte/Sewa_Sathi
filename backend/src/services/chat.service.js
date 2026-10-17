const mongoose = require("mongoose");
const { Conversation } = require("../models/Conversation");
const { Message } = require("../models/Message");
const { Booking } = require("../models/Booking");
const { Provider } = require("../models/Provider");
const { User, USER_STATUS } = require("../models/User");
const AppError = require("../utils/AppError");

const getAuthenticatedUserId = (user) => {
  const userId = user?.id || user?._id || user?.sub;
  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw new AppError("Invalid authenticated user", 401, "INVALID_AUTHENTICATED_USER");
  }
  return userId;
};

/**
 * Get or create a conversation between the authenticated user and another user or for a booking.
 */
const getOrCreateConversation = async (user, { bookingId, recipientId }) => {
  const userId = getAuthenticatedUserId(user);

  let targetRecipientId = null;
  let targetBookingId = null;

  if (bookingId) {
    if (!mongoose.isValidObjectId(bookingId)) {
      throw new AppError("Invalid booking ID", 400, "INVALID_ID");
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
    }

    targetBookingId = booking._id;

    // Determine the provider's user account
    const provider = await Provider.findById(booking.provider).select("user");
    if (!provider || !provider.user) {
      throw new AppError("Provider account not found", 404, "PROVIDER_NOT_FOUND");
    }

    const providerUserId = provider.user;
    const customerUserId = booking.customer;

    if (
      String(userId) !== String(customerUserId) &&
      String(userId) !== String(providerUserId)
    ) {
      throw new AppError(
        "You do not have permission to access chat for this booking",
        403,
        "CHAT_ACCESS_DENIED"
      );
    }

    targetRecipientId = String(userId) === String(customerUserId) ? providerUserId : customerUserId;
  } else if (recipientId) {
    if (!mongoose.isValidObjectId(recipientId)) {
      throw new AppError("Invalid recipient ID", 400, "INVALID_ID");
    }

    if (String(userId) === String(recipientId)) {
      throw new AppError("You cannot start a conversation with yourself", 400, "INVALID_RECIPIENT");
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      throw new AppError("Recipient user not found", 404, "USER_NOT_FOUND");
    }

    targetRecipientId = recipient._id;
  } else {
    throw new AppError("Either bookingId or recipientId must be provided", 400, "INVALID_REQUEST");
  }

  // Look for existing conversation
  const query = {
    participants: { $all: [userId, targetRecipientId] },
  };
  if (targetBookingId) {
    query.booking = targetBookingId;
  }

  let conversation = await Conversation.findOne(query)
    .populate("participants", "firstName lastName profileImage role")
    .populate("booking", "bookingNumber status scheduledDate");

  if (!conversation) {
    const unreadMap = new Map();
    unreadMap.set(userId.toString(), 0);
    unreadMap.set(targetRecipientId.toString(), 0);

    conversation = await Conversation.create({
      participants: [userId, targetRecipientId],
      booking: targetBookingId,
      unreadCounts: unreadMap,
    });

    conversation = await Conversation.findById(conversation._id)
      .populate("participants", "firstName lastName profileImage role")
      .populate("booking", "bookingNumber status scheduledDate");
  }

  return conversation;
};

/**
 * List all conversations for the authenticated user.
 */
const getUserConversations = async (user, query = {}) => {
  const userId = getAuthenticatedUserId(user);

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const filter = { participants: userId };

  const [conversations, total] = await Promise.all([
    Conversation.find(filter)
      .populate("participants", "firstName lastName profileImage role")
      .populate("booking", "bookingNumber status")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Conversation.countDocuments(filter),
  ]);

  // Format to identify the other participant easily
  const formatted = conversations.map((conv) => {
    const otherParticipant = conv.participants.find(
      (p) => String(p._id) !== String(userId)
    );
    const unreadCount = conv.unreadCounts?.[userId.toString()] || 0;

    return {
      ...conv,
      otherParticipant,
      unreadCount,
    };
  });

  return {
    conversations: formatted,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Get messages inside a conversation.
 */
const getConversationMessages = async (user, conversationId, query = {}) => {
  const userId = getAuthenticatedUserId(user);

  if (!mongoose.isValidObjectId(conversationId)) {
    throw new AppError("Invalid conversation ID", 400, "INVALID_ID");
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });

  if (!conversation) {
    throw new AppError("Conversation not found", 404, "CONVERSATION_NOT_FOUND");
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 50));
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    Message.find({ conversation: conversation._id })
      .populate("sender", "firstName lastName profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Message.countDocuments({ conversation: conversation._id }),
  ]);

  return {
    messages: messages.reverse(), // chronologically ordered (oldest to newest for rendering)
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Send a message inside an existing conversation.
 */
const sendMessage = async (user, conversationId, { text }) => {
  const userId = getAuthenticatedUserId(user);

  if (!mongoose.isValidObjectId(conversationId)) {
    throw new AppError("Invalid conversation ID", 400, "INVALID_ID");
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });

  if (!conversation) {
    throw new AppError("Conversation not found", 404, "CONVERSATION_NOT_FOUND");
  }

  const receiverId = conversation.participants.find(
    (p) => String(p) !== String(userId)
  );

  if (!receiverId) {
    throw new AppError("Conversation has invalid participants", 400, "INVALID_CONVERSATION");
  }

  const message = await Message.create({
    conversation: conversation._id,
    sender: userId,
    receiver: receiverId,
    text,
  });

  // Update conversation lastMessage & unread count
  const currentUnread = conversation.unreadCounts?.get(receiverId.toString()) || 0;
  if (!conversation.unreadCounts) {
    conversation.unreadCounts = new Map();
  }
  conversation.unreadCounts.set(receiverId.toString(), currentUnread + 1);

  conversation.lastMessage = {
    text,
    sender: userId,
    createdAt: message.createdAt,
  };

  await conversation.save();

  return Message.findById(message._id)
    .populate("sender", "firstName lastName profileImage")
    .populate("receiver", "firstName lastName profileImage")
    .lean();
};

/**
 * Mark all messages in a conversation as read for the authenticated user.
 */
const markConversationAsRead = async (user, conversationId) => {
  const userId = getAuthenticatedUserId(user);

  if (!mongoose.isValidObjectId(conversationId)) {
    throw new AppError("Invalid conversation ID", 400, "INVALID_ID");
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });

  if (!conversation) {
    throw new AppError("Conversation not found", 404, "CONVERSATION_NOT_FOUND");
  }

  await Message.updateMany(
    {
      conversation: conversation._id,
      receiver: userId,
      read: false,
    },
    {
      $set: {
        read: true,
        readAt: new Date(),
      },
    }
  );

  if (conversation.unreadCounts) {
    conversation.unreadCounts.set(userId.toString(), 0);
    await conversation.save();
  }

  return { success: true, conversationId: conversation._id };
};

module.exports = {
  getOrCreateConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markConversationAsRead,
};
