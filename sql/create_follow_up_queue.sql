-- ═══════════════════════════════════════════════════════════════════════════════
-- Tabela: follow_up_queue
-- Fila de follow-up automático — leads que pararam de responder
--
-- O cron (a cada hora) busca leads com next_attempt_at <= now() e status='pending'
-- Envia mensagem de reengajamento progressiva e agenda a próxima tentativa
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS follow_up_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- Controle de tentativas
  attempt_number INT NOT NULL DEFAULT 0,       -- 0 = ainda não tentou, 1 = primeira tentativa...
  max_attempts INT NOT NULL DEFAULT 5,          -- configurável pela org

  -- Agendamento
  next_attempt_at TIMESTAMPTZ,                  -- quando disparar a próxima tentativa
  last_attempt_at TIMESTAMPTZ,                  -- quando foi a última tentativa
  last_lead_message_at TIMESTAMPTZ,             -- última msg do lead (para calcular silêncio)

  -- Cadência em horas entre tentativas (array JSON)
  -- Padrão: [4, 24, 72, 120, 168] = 4h, 1 dia, 3 dias, 5 dias, 7 dias
  cadence_hours JSONB NOT NULL DEFAULT '[4, 24, 72, 120, 168]',

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'responded', 'exhausted', 'cancelled')),
  -- pending = aguardando primeira tentativa
  -- active = em andamento (já fez pelo menos 1 tentativa)
  -- responded = lead respondeu — sucesso!
  -- exhausted = esgotou todas as tentativas
  -- cancelled = cancelado manualmente

  -- Contexto para o prompt
  last_conversation_summary TEXT,               -- resumo da última conversa (do end_conversation)
  lead_stage TEXT,                               -- stage do lead quando entrou na fila

  -- WhatsApp instance info
  instance_name TEXT NOT NULL,
  agent_id UUID,
  campaign_id UUID,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══ Indexes ═══

-- Query principal do cron: leads prontos para follow-up
CREATE INDEX IF NOT EXISTS idx_follow_up_queue_next_attempt
  ON follow_up_queue(next_attempt_at)
  WHERE status IN ('pending', 'active');

-- Busca por org (dashboard)
CREATE INDEX IF NOT EXISTS idx_follow_up_queue_org
  ON follow_up_queue(org_id, status);

-- Busca por lead (evitar duplicatas + reset no webhook)
CREATE INDEX IF NOT EXISTS idx_follow_up_queue_lead
  ON follow_up_queue(lead_id)
  WHERE status IN ('pending', 'active');

-- ═══ RLS Policies ═══

ALTER TABLE follow_up_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org follow-ups"
  ON follow_up_queue FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert follow-ups for their org"
  ON follow_up_queue FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update their org follow-ups"
  ON follow_up_queue FOR UPDATE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete their org follow-ups"
  ON follow_up_queue FOR DELETE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- ═══ Habilitar Realtime (opcional) ═══
-- Database → Replication → ativar follow_up_queue
