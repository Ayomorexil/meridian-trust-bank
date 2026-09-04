-- Migration: member/support live chat
-- Safe additive migration. Does not delete or modify existing data.

BEGIN;

CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL
    REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL
    REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id
  ON chat_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_status
  ON chat_conversations(status);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id
  ON chat_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at
  ON chat_messages(created_at);

COMMIT;