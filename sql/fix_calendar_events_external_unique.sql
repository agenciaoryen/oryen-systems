-- Migração: troca índice parcial por índice completo em calendar_events
-- Motivo: o upsert do Supabase (PostgREST) não aceita índice único parcial
-- como alvo de ON CONFLICT. Precisa ser um índice "normal".
-- Múltiplas linhas com external_id NULL continuam permitidas porque, por default
-- do Postgres, NULLs são tratados como distintos em índices únicos.

DROP INDEX IF EXISTS idx_calendar_events_external_unique;

CREATE UNIQUE INDEX idx_calendar_events_external_unique
  ON calendar_events(external_integration_id, external_id);
