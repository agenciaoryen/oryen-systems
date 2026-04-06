-- Adiciona campo de configuração dos campos exibidos no card do lead (kanban)
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS lead_card_config JSONB DEFAULT NULL;

-- Exemplo de valor:
-- {
--   "fields": ["total_em_vendas", "phone", "email", "tags", "source", "created_at"],
--   "show_stale_indicator": true,
--   "show_ai_status": true
-- }
-- Se NULL, usa config padrão com todos os campos visíveis
