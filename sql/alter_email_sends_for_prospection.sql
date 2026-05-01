-- ═══════════════════════════════════════════════════════════════════════════════
-- alter_email_sends_for_prospection.sql
-- Permite que email_sends seja usado pelo handler send_email via kernel
-- (caminho via prospection_module / agent_actions), além do caminho legado
-- via campanhas de email_contacts.
--
-- Mudanças:
--   - campaign_id e contact_id viram NULLABLE (caminho prospection não tem)
--   - lead_id (FK leads) — referência direta pro lead que recebeu
--   - agent_id (FK agents) — qual colaborador IA mandou
--   - action_id (FK agent_actions) — linhagem pro audit do kernel
-- ═══════════════════════════════════════════════════════════════════════════════

-- Torna campaign_id nullable (caminho prospection não usa)
ALTER TABLE email_sends ALTER COLUMN campaign_id DROP NOT NULL;

-- Torna contact_id nullable (caminho prospection não usa email_contacts)
ALTER TABLE email_sends ALTER COLUMN contact_id DROP NOT NULL;

-- Adiciona lead_id pra referência direta
ALTER TABLE email_sends
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES leads(id) ON DELETE SET NULL;

-- Quem é o "colaborador" IA que mandou
ALTER TABLE email_sends
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES agents(id) ON DELETE SET NULL;

-- Liga ao audit do kernel (cada email_send vira "filho" de uma action)
ALTER TABLE email_sends
  ADD COLUMN IF NOT EXISTS action_id uuid REFERENCES agent_actions(id) ON DELETE SET NULL;

-- Índices novos pros caminhos de leitura mais comuns
CREATE INDEX IF NOT EXISTS idx_email_sends_lead
  ON email_sends(lead_id, created_at DESC)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_sends_agent_created
  ON email_sends(agent_id, created_at DESC)
  WHERE agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_sends_action
  ON email_sends(action_id)
  WHERE action_id IS NOT NULL;

COMMENT ON COLUMN email_sends.lead_id IS
  'Caminho prospection: lead que recebeu (campaign_id pode ser null nesse caso).';
COMMENT ON COLUMN email_sends.agent_id IS
  'Qual colaborador IA disparou esse envio (perfil do agente em /dashboard/agents).';
COMMENT ON COLUMN email_sends.action_id IS
  'Action correspondente em agent_actions (audit log do kernel).';
