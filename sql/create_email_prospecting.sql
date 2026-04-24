-- ═══════════════════════════════════════════════════════════════════════════════
-- Módulo: Email BDR (Prospecção por email frio)
--
-- Reusa a estrutura agent_solutions / agents / agent_campaigns. Adiciona:
--   - email_contacts: contatos carregados via CSV pra uma campanha
--   - email_sends: cada envio individual (1 row por contato por campanha)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Contatos importados por campanha ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES agent_campaigns(id) ON DELETE CASCADE,

  email TEXT NOT NULL,
  first_name TEXT,
  company TEXT,
  role TEXT,
  city TEXT,
  phone TEXT,
  -- Dados adicionais do CSV (qualquer coluna extra vai aqui)
  custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Status do contato: pending (ainda não foi enviado), processing (na fila),
  -- sent (enviado), skipped (email inválido, bounced previamente, duplicado)
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'skipped')),
  skip_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_contacts_campaign_status
  ON email_contacts(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_email_contacts_org
  ON email_contacts(org_id);
-- Previne envio duplicado pra mesmo email na mesma campanha
CREATE UNIQUE INDEX IF NOT EXISTS ux_email_contacts_campaign_email
  ON email_contacts(campaign_id, lower(email));

-- ─── Envios (um registro por email disparado) ────────────────────────────────
CREATE TABLE IF NOT EXISTS email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES agent_campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES email_contacts(id) ON DELETE CASCADE,

  -- Conteúdo gerado pela IA (guardar pra auditoria e análise)
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  body_html TEXT,

  -- Resend tracking
  resend_message_id TEXT,

  -- Status da entrega/engajamento
  -- queued  → na fila pra enviar
  -- sent    → Resend aceitou
  -- delivered → chegou na caixa
  -- opened  → abriu (pixel rastreado)
  -- clicked → clicou num link
  -- replied → respondeu (via Resend inbound ou reply-to)
  -- bounced → voltou
  -- failed  → erro no envio
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed', 'cancelled')),

  -- Timestamps por evento (None = não aconteceu ainda)
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,

  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_sends_campaign_status
  ON email_sends(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_email_sends_status_queued
  ON email_sends(status, created_at)
  WHERE status = 'queued';
CREATE UNIQUE INDEX IF NOT EXISTS ux_email_sends_resend_message_id
  ON email_sends(resend_message_id)
  WHERE resend_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_sends_org_created
  ON email_sends(org_id, created_at DESC);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE email_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_contacts_select_org ON email_contacts;
CREATE POLICY email_contacts_select_org ON email_contacts
  FOR SELECT USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS email_contacts_modify_org ON email_contacts;
CREATE POLICY email_contacts_modify_org ON email_contacts
  FOR ALL USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()))
  WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS email_sends_select_org ON email_sends;
CREATE POLICY email_sends_select_org ON email_sends
  FOR SELECT USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS email_sends_service_role ON email_sends;
CREATE POLICY email_sends_service_role ON email_sends
  FOR ALL USING (auth.role() = 'service_role');
