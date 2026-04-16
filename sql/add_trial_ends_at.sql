-- Adiciona coluna trial_ends_at na tabela orgs
-- Usado pelo sistema de trial staff-only (3 dias)
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT NULL;

-- Índice para o cron de expiração de trials
CREATE INDEX IF NOT EXISTS idx_orgs_trial_ends_at ON orgs (trial_ends_at) WHERE trial_ends_at IS NOT NULL;
