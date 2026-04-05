-- ═══════════════════════════════════════════════════════════════════════════════
-- Tabela: site_leads
-- Leads capturados pelo formulário de contato do site público
-- Separada da tabela leads (CRM) — sync manual ou automático
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS site_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,

  -- Dados do contato
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  message TEXT,

  -- Rastreamento
  source TEXT DEFAULT 'site',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Sync com CRM
  synced_to_crm BOOLEAN DEFAULT false,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══ Indexes ═══

CREATE INDEX IF NOT EXISTS idx_site_leads_org
  ON site_leads(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_site_leads_property
  ON site_leads(property_id)
  WHERE property_id IS NOT NULL;

-- ═══ RLS Policies ═══

ALTER TABLE site_leads ENABLE ROW LEVEL SECURITY;

-- Membros da org podem ver leads do site
CREATE POLICY "Org members can view site leads"
  ON site_leads FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Membros da org podem atualizar (marcar sync)
CREATE POLICY "Org members can update site leads"
  ON site_leads FOR UPDATE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));
