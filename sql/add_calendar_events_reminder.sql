-- ═══════════════════════════════════════════════════════════════════════════════
-- add_calendar_events_reminder.sql
-- Adiciona suporte a lembretes em eventos.
-- reminder_minutes: minutos antes do evento para disparar lembrete
-- last_reminder_sent_at: controle para não disparar múltiplas vezes
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS reminder_minutes INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_reminder_pending
  ON calendar_events(event_date, start_time)
  WHERE reminder_minutes IS NOT NULL
    AND last_reminder_sent_at IS NULL
    AND status = 'scheduled';
