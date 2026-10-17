const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  startConversation,
  listConversations,
  listMessages,
  postMessage,
  readConversation,
} = require("../controllers/chat.controller");
const {
  startConversationSchema,
  conversationIdSchema,
  sendMessageSchema,
  chatListSchema,
} = require("../validators/chat.validator");

// All chat endpoints require authentication
router.use(authenticate);

// Start or get existing conversation
router.post(
  "/conversations",
  validate(startConversationSchema),
  startConversation
);

// List all conversations for the user
router.get(
  "/conversations",
  validate(chatListSchema),
  listConversations
);

// Get messages in a conversation
router.get(
  "/conversations/:id/messages",
  validate(conversationIdSchema),
  listMessages
);

// Send a message in a conversation
router.post(
  "/conversations/:id/messages",
  validate(sendMessageSchema),
  postMessage
);

// Mark conversation messages as read
router.patch(
  "/conversations/:id/read",
  validate(conversationIdSchema),
  readConversation
);

module.exports = router;
