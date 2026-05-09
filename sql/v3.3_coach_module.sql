-- ============================================================
-- v3.3 -- Oryen Coach Module
-- Tables: coach_conversations, coach_messages, coach_memory
-- ============================================================

-- 1. COACH CONVERSATIONS
CREATE TABLE IF NOT EXISTS coach_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  title TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE coach_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY coach_conversations_select ON coach_conversations
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY coach_conversations_insert ON coach_conversations
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY coach_conversations_update ON coach_conversations
  FOR UPDATE USING (
    user_id = auth.uid()
  );

CREATE INDEX idx_coach_conv_org_user ON coach_conversations(org_id, user_id);
CREATE INDEX idx_coach_conv_status ON coach_conversations(org_id, user_id, status);

-- 2. COACH MESSAGES
CREATE TABLE IF NOT EXISTS coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_conversation_id UUID NOT NULL REFERENCES coach_conversations(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'coach')),
  body TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'greeting', 'analysis', 'suggestion', 'alert', 'insight')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY coach_messages_select ON coach_messages
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY coach_messages_insert ON coach_messages
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE INDEX idx_coach_msg_conv ON coach_messages(coach_conversation_id, created_at);

-- 3. COACH MEMORY (long-term per user)
CREATE TABLE IF NOT EXISTS coach_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id, key)
);

ALTER TABLE coach_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY coach_memory_select ON coach_memory
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY coach_memory_insert ON coach_memory
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY coach_memory_update ON coach_memory
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE INDEX idx_coach_memory_org_user ON coach_memory(org_id, user_id);
