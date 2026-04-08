-- Lead Scoring System
-- Score calculado automaticamente baseado em comportamento do lead

-- Adicionar coluna score na tabela leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS score INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_label TEXT DEFAULT 'cold'
    CHECK (score_label IN ('hot', 'warm', 'cold', 'lost')),
  ADD COLUMN IF NOT EXISTS score_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(org_id, score DESC);

-- Tabela de histórico de ações do lead (para cálculo de score)
CREATE TABLE IF NOT EXISTS lead_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'inbound_message',    -- lead mandou msg (+15)
    'outbound_message',   -- sistema respondeu (+2)
    'meeting_scheduled',  -- agendou visita (+25)
    'meeting_attended',   -- compareceu na visita (+30)
    'meeting_no_show',    -- não compareceu (-10)
    'property_inquiry',   -- perguntou sobre imóvel (+10)
    'document_sent',      -- recebeu documento/proposta (+15)
    'document_viewed',    -- visualizou documento (+10)
    'follow_up_responded',-- respondeu follow-up (+20)
    'follow_up_ignored',  -- ignorou follow-up (-5)
    'stage_advanced',     -- avançou no pipeline (+15)
    'stage_regressed',    -- regrediu no pipeline (-10)
    'long_inactivity',    -- >7 dias sem interação (-15)
    'positive_sentiment', -- msg com sentimento positivo (+5)
    'negative_sentiment', -- msg com sentimento negativo (-5)
    'site_lead',          -- veio pelo site (+5)
    'manual_boost'        -- boost manual pelo corretor (+20)
  )),
  points INT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_activity_log_lead
  ON lead_activity_log(lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_activity_log_org
  ON lead_activity_log(org_id, created_at DESC);

ALTER TABLE lead_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view own activity logs"
  ON lead_activity_log FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));
