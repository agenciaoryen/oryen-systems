-- ═══════════════════════════════════════════════════════════════════════════════
-- add_calendar_events_recurrence.sql
-- Adiciona suporte a eventos recorrentes (RRULE).
-- rrule: string RRULE (ex: "FREQ=WEEKLY;BYDAY=MO")
-- excluded_dates: datas excluídas de uma série
-- recurrence_master_id: aponta para o evento mestre (para overrides)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS rrule TEXT,
  ADD COLUMN IF NOT EXISTS excluded_dates DATE[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recurrence_master_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_calendar_events_recurrence_master
  ON calendar_events(recurrence_master_id)
  WHERE recurrence_master_id IS NOT NULL;
