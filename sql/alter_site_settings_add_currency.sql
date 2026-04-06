-- Adicionar campo currency na tabela site_settings
-- Cada site pode ter sua própria moeda para exibição de preços

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'BRL';

-- Comentário descritivo
COMMENT ON COLUMN site_settings.currency IS 'Código ISO da moeda usada no site (BRL, USD, CLP, etc.)';
