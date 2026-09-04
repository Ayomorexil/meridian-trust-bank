const { db } = require("../config/db");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// Get or create the current user's open conversation
exports.getOrCreateConversation = catchAsync(async (req, res) => {
  let conversation = await db.oneOrNone(
    `SELECT *
     FROM chat_conversations
     WHERE user_id = $1 AND status = 'open'
     ORDER BY created_at DESC
     LIMIT 1`,
    [req.user.id],
  );

  if (!conversation) {
    conversation = await db.one(
      `INSERT INTO chat_conversations (user_id)
       VALUES ($1)
       RETURNING *`,
      [req.user.id],
    );
  }

  res.status(200).json({
    status: "success",
    data: { conversation },
  });
});

// Get messages for a conversation belonging to the current user
exports.getMessages = catchAsync(async (req, res, next) => {
  const conversation = await db.oneOrNone(
    `SELECT id
     FROM chat_conversations
     WHERE id = $1 AND user_id = $2`,
    [req.params.conversationId, req.user.id],
  );

  if (!conversation) {
    return next(new AppError("Chat conversation not found.", 404));
  }

  const messages = await db.any(
    `SELECT
       m.id,
       m.conversation_id,
       m.sender_id,
       m.message,
       m.created_at,
       m.read_at,
       u.first_name,
       u.last_name
     FROM chat_messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = $1
     ORDER BY m.created_at ASC`,
    [req.params.conversationId],
  );

  res.status(200).json({
    status: "success",
    results: messages.length,
    data: { messages },
  });
});

// Send a message as the current user
exports.sendMessage = catchAsync(async (req, res, next) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    return next(new AppError("Message cannot be empty.", 400));
  }

  const conversation = await db.oneOrNone(
    `SELECT id
     FROM chat_conversations
     WHERE id = $1 AND user_id = $2 AND status = 'open'`,
    [req.params.conversationId, req.user.id],
  );

  if (!conversation) {
    return next(new AppError("Open chat conversation not found.", 404));
  }

  const newMessage = await db.tx(async (t) => {
    const created = await t.one(
      `INSERT INTO chat_messages
       (conversation_id, sender_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [conversation.id, req.user.id, message.trim()],
    );

    await t.none(
      `UPDATE chat_conversations
       SET updated_at = now()
       WHERE id = $1`,
      [conversation.id],
    );

    return created;
  });

  res.status(201).json({
    status: "success",
    data: { message: newMessage },
  });
});

// Close the current user's conversation
exports.closeConversation = catchAsync(async (req, res, next) => {
  const conversation = await db.oneOrNone(
    `UPDATE chat_conversations
     SET status = 'closed', updated_at = now()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [req.params.conversationId, req.user.id],
  );

  if (!conversation) {
    return next(new AppError("Chat conversation not found.", 404));
  }

  res.status(200).json({
    status: "success",
    data: { conversation },
  });
});
