-- ═══════════════════════════════════════════════════════════════════════════════
-- create_event_checklists.sql
-- Tabela de checklists por evento. Permite que cada evento tenha uma lista
-- de itens a serem verificados (ex: "Levar contrato", "Confirmar horário").
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS event_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_checklists_event
  ON event_checklists(event_id, position);

-- RLS: mesma lógica do calendar_events (filtro por org_id)
ALTER TABLE event_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_checklists_select" ON event_checklists FOR SELECT USING (
  event_id IN (SELECT id FROM calendar_events WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid()))
);

CREATE POLICY "event_checklists_insert" ON event_checklists FOR INSERT WITH CHECK (
  event_id IN (SELECT id FROM calendar_events WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid()))
);

CREATE POLICY "event_checklists_update" ON event_checklists FOR UPDATE USING (
  event_id IN (SELECT id FROM calendar_events WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid()))
);

CREATE POLICY "event_checklists_delete" ON event_checklists FOR DELETE USING (
  event_id IN (SELECT id FROM calendar_events WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid()))
);

-- Realtime para atualizações ao vivo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'event_checklists'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE event_checklists;
  END IF;
END $$;
