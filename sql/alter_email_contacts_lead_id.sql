-- Adiciona link entre email_contacts e leads do CRM.
-- Quando o contato veio de upload de CSV direto, lead_id = NULL.
-- Quando foi importado do CRM, lead_id aponta pro lead original.
--
-- Usos:
--   1. Evitar duplo contato (filtrar leads que já estão em alguma campanha)
--   2. Quando o lead responder, conseguimos linkar a resposta de volta no CRM
--   3. Estatísticas: "quantos dos emails enviados para leads do CRM converteram?"

ALTER TABLE email_contacts
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;

-- Índice pra consultas "este lead já está em alguma campanha?"
CREATE INDEX IF NOT EXISTS idx_email_contacts_org_lead
  ON email_contacts(org_id, lead_id)
  WHERE lead_id IS NOT NULL;

-- Índice pra consultas "todos os email_contacts de um lead"
CREATE INDEX IF NOT EXISTS idx_email_contacts_lead
  ON email_contacts(lead_id)
  WHERE lead_id IS NOT NULL;

-- Evita importar o mesmo lead 2x na mesma campanha (além da unique já existente por email)
CREATE UNIQUE INDEX IF NOT EXISTS ux_email_contacts_campaign_lead
  ON email_contacts(campaign_id, lead_id)
  WHERE lead_id IS NOT NULL;
