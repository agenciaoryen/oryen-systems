-- Adiciona campos estruturados em lead_events pra suportar relatórios de fluxo:
--   - details: jsonb pra dados estruturados do evento
--     (ex: {from_stage: 'captado', to_stage: 'contatado', from_stage_label: 'Captado', to_stage_label: 'Contatado'})
--   - user_id: quem realizou o evento (nullable — eventos do SDR têm NULL)
--
-- Eventos antigos ficam com details = '{}' e user_id = NULL.
-- O relatório de fluxo só conta eventos com details.to_stage definido, então histórico antigo
-- não aparece (apenas eventos a partir deste deploy contam).

ALTER TABLE lead_events
  ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE SET NULL;

-- Índice pra query "eventos do tipo X no período Y"
CREATE INDEX IF NOT EXISTS idx_lead_events_type_created_at
  ON lead_events(type, created_at DESC);

-- Índice pra query "atividade de um usuário no período"
CREATE INDEX IF NOT EXISTS idx_lead_events_user_created_at
  ON lead_events(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;
