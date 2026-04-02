-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: sdr_messages
-- Histórico de conversas do SDR (substitui n8n_chat_histories)
-- Armazena tanto mensagens do lead quanto respostas do agente
-- Rodar no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sdr_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES agent_campaigns(id) ON DELETE SET NULL,
  instance_name TEXT,

  -- Conteúdo
  phone TEXT NOT NULL,                    -- numero normalizado do lead
  role TEXT NOT NULL DEFAULT 'user'       -- 'user' (lead) | 'assistant' (agente IA) | 'system' (interno)
    CHECK (role IN ('user', 'assistant', 'system')),
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',      -- text, image, audio, video, document

  -- Metadados da mensagem
  whatsapp_message_id TEXT,               -- ID original do WhatsApp
  push_name TEXT,                         -- nome do contato no WhatsApp

  -- Análise (preenchido após processamento IA)
  sentiment TEXT                          -- positivo | neutro | negativo
    CHECK (sentiment IS NULL OR sentiment IN ('positivo', 'neutro', 'negativo')),
  emotion TEXT,                           -- emoção detectada (opcional)

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ               -- quando a IA processou esta mensagem
);

-- Índices para consultas frequentes
-- 1. Buscar histórico de conversa (contexto para IA)
CREATE INDEX IF NOT EXISTS idx_sdr_messages_lead_created
  ON sdr_messages(lead_id, created_at DESC);

-- 2. Buscar por telefone (fallback se lead_id não disponível)
CREATE INDEX IF NOT EXISTS idx_sdr_messages_phone_created
  ON sdr_messages(phone, org_id, created_at DESC);

-- 3. Buscar por org (relatórios)
CREATE INDEX IF NOT EXISTS idx_sdr_messages_org
  ON sdr_messages(org_id, created_at DESC);

-- 4. Buscar por campanha
CREATE INDEX IF NOT EXISTS idx_sdr_messages_campaign
  ON sdr_messages(campaign_id, created_at DESC);

-- RLS
ALTER TABLE sdr_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view own messages"
  ON sdr_messages FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

-- Apenas service_role insere (API route usa SUPABASE_SERVICE_ROLE_KEY)
-- Nenhuma policy de INSERT para anon/authenticated — só service_role bypassa RLS
