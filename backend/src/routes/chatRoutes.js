const express = require("express");
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/chatController");

const router = express.Router();

router.use(protect);

// Get or create the logged-in user's open conversation
router.get("/conversation", ctrl.getOrCreateConversation);

// Get messages
router.get("/conversation/:conversationId/messages", ctrl.getMessages);

// Send a message
router.post("/conversation/:conversationId/messages", ctrl.sendMessage);

// Close conversation
router.patch("/conversation/:conversationId/close", ctrl.closeConversation);

module.exports = router;
