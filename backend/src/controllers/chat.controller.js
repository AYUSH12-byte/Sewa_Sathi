const asyncHandler = require("../utils/asyncHandler");
const { createdResponse, successResponse } = require("../utils/apiResponse");
const {
  getOrCreateConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markConversationAsRead,
} = require("../services/chat.service");

/**
 * Start or retrieve an existing conversation.
 */
const startConversation = asyncHandler(async (req, res) => {
  const conversation = await getOrCreateConversation(
    req.user,
    req.validated.body
  );

  return successResponse({
    res,
    message: "Conversation retrieved successfully.",
    data: { conversation },
  });
});

/**
 * List all conversations for authenticated user.
 */
const listConversations = asyncHandler(async (req, res) => {
  const result = await getUserConversations(req.user, req.validated.query);

  return successResponse({
    res,
    message: "Conversations retrieved successfully.",
    data: result,
  });
});

/**
 * Get messages inside a conversation.
 */
const listMessages = asyncHandler(async (req, res) => {
  const result = await getConversationMessages(
    req.user,
    req.validated.params.id,
    req.validated.query
  );

  return successResponse({
    res,
    message: "Messages retrieved successfully.",
    data: result,
  });
});

/**
 * Send a message inside a conversation.
 */
const postMessage = asyncHandler(async (req, res) => {
  const message = await sendMessage(
    req.user,
    req.validated.params.id,
    req.validated.body
  );

  return createdResponse({
    res,
    message: "Message sent successfully.",
    data: { message },
  });
});

/**
 * Mark messages in a conversation as read.
 */
const readConversation = asyncHandler(async (req, res) => {
  const result = await markConversationAsRead(
    req.user,
    req.validated.params.id
  );

  return successResponse({
    res,
    message: "Conversation marked as read.",
    data: result,
  });
});

module.exports = {
  startConversation,
  listConversations,
  listMessages,
  postMessage,
  readConversation,
};
