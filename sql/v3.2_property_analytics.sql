-- ═══════════════════════════════════════════════════════════════════════════════
-- v3.2 — Property Analytics (Tracking de eventos por imóvel)
-- Tabela para registrar views, cliques, interações no site público
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS property_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,        -- 'view', 'click', 'gallery_open', 'contact_open', 'contact_submit', 'whatsapp_click', 'share'
  visitor_id TEXT,                  -- fingerprint anônimo (hash session, sem PII)
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_events_org ON property_events(org_id);
CREATE INDEX IF NOT EXISTS idx_property_events_property ON property_events(property_id, created_at);
CREATE INDEX IF NOT EXISTS idx_property_events_type ON property_events(org_id, event_type, created_at);

-- RLS: apenas service_role pode inserir (API interna)
ALTER TABLE property_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on property_events"
  ON property_events FOR ALL
  USING (true)
  WITH CHECK (true);
