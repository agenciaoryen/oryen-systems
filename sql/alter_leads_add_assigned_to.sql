-- Adicionar campo assigned_to na tabela leads
-- Para distribuição de leads entre corretores da org

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to
  ON leads(assigned_to) WHERE assigned_to IS NOT NULL;

COMMENT ON COLUMN leads.assigned_to IS 'ID do usuario responsavel pelo lead (round-robin automatico)';
