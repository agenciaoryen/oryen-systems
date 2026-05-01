-- ═══════════════════════════════════════════════════════════════════════════════
-- add_calendar_events_assigned_to.sql
-- Adiciona coluna assigned_to (FK → users) para atribuir eventos a membros
-- da equipe. Permite o Time Calendar (ver agenda de cada colaborador).
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_assigned_to
  ON calendar_events(assigned_to)
  WHERE assigned_to IS NOT NULL;
