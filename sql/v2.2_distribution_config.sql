-- v2.2 Lead Roulette — Distribuição Inteligente de Leads
-- Migration: tabelas de configuração, log de atribuições, campos extras em leads

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Config de distribuição na tabela orgs
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE orgs ADD COLUMN IF NOT EXISTS distribution_config JSONB DEFAULT NULL;

COMMENT ON COLUMN orgs.distribution_config IS 'Lead Roulette v2.2 — config de distribuição inteligente';

-- Schema esperado do JSONB:
-- {
--   "strategy": "round_robin" | "balanced_load" | "score_weighted" | "expertise_match",
--   "enabled": true,
--   "auto_reassign_enabled": true,
--   "auto_reassign_timeout_minutes": 30,
--   "stale_threshold_days": 5,
--   "max_leads_per_broker": null,
--   "eligible_roles": ["owner", "admin", "vendedor"],
--   "working_hours": { "start": "08:00", "end": "20:00", "timezone": "America/Sao_Paulo" }
-- }

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Configuração por corretor
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS broker_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,

  -- Disponibilidade
  is_available BOOLEAN NOT NULL DEFAULT true,
  max_active_leads INT DEFAULT NULL,

  -- Especialidades (imobiliário)
  regions TEXT[] DEFAULT '{}',
  cities TEXT[] DEFAULT '{}',
  property_types TEXT[] DEFAULT '{}',
  transaction_types TEXT[] DEFAULT '{}',
  price_range_min NUMERIC(15,2) DEFAULT NULL,
  price_range_max NUMERIC(15,2) DEFAULT NULL,

  -- Métricas de performance (cache, atualizado por cron)
  conversion_rate NUMERIC(5,2) DEFAULT 0,
  avg_response_time_min INT DEFAULT NULL,
  active_lead_count INT DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_broker_config_org
  ON broker_config(org_id, is_available);

ALTER TABLE broker_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view broker configs"
  ON broker_config FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage broker configs"
  ON broker_config FOR ALL
  USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Log de atribuições (audit trail)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lead_assignment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  assigned_from UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'auto_distribution',
    'auto_reassign',
    'manual_reassign',
    'broker_unavailable',
    'stale_lead_reassign',
    'load_rebalance'
  )),
  strategy_used TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignment_log_lead
  ON lead_assignment_log(lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assignment_log_org
  ON lead_assignment_log(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assignment_log_broker
  ON lead_assignment_log(assigned_to, created_at DESC);

ALTER TABLE lead_assignment_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view assignment logs"
  ON lead_assignment_log FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Campos extras em leads para distribuição
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_stage_change_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_leads_stale
  ON leads(org_id, stage, updated_at)
  WHERE stage NOT IN ('won', 'lost', 'perdido', 'ganho');

CREATE INDEX IF NOT EXISTS idx_leads_unresponded
  ON leads(org_id, assigned_to, assigned_at)
  WHERE assigned_to IS NOT NULL AND first_response_at IS NULL;
