-- ═══════════════════════════════════════════════════════════════════════════════
-- Tabela: calendar_events
-- Módulo de agenda para corretores — visitas, reuniões, follow-ups
-- Alimentado pelo agente SDR (schedule_visit) e pela UI do dashboard
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Detalhes do evento
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'other'
    CHECK (event_type IN ('visit', 'meeting', 'follow_up', 'other')),

  -- Agendamento
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,

  -- Localização
  address TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),

  -- Quem criou: UUID do usuário ou 'sdr_agent'
  created_by TEXT NOT NULL DEFAULT 'user',
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══ Indexes ═══

-- Busca principal: eventos de uma org por data
CREATE INDEX IF NOT EXISTS idx_calendar_events_org_date
  ON calendar_events(org_id, event_date DESC);

-- Busca de disponibilidade: eventos agendados por data/hora
CREATE INDEX IF NOT EXISTS idx_calendar_events_availability
  ON calendar_events(org_id, event_date, start_time)
  WHERE status = 'scheduled';

-- Busca por lead (perfil do lead → próximos compromissos)
CREATE INDEX IF NOT EXISTS idx_calendar_events_lead
  ON calendar_events(lead_id)
  WHERE lead_id IS NOT NULL;

-- ═══ RLS Policies ═══

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org events"
  ON calendar_events FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert events for their org"
  ON calendar_events FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update their org events"
  ON calendar_events FOR UPDATE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete their org events"
  ON calendar_events FOR DELETE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- ═══ Habilitar Realtime ═══
-- IMPORTANTE: Depois de rodar este SQL, vá em Database → Replication
-- e ative a publicação para a tabela calendar_events
