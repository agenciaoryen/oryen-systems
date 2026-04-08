-- v2.3 Calculadora de Financiamento
-- Adiciona campo JSONB para salvar simulações de financiamento por lead

ALTER TABLE leads ADD COLUMN IF NOT EXISTS financing_simulations JSONB DEFAULT '[]';

COMMENT ON COLUMN leads.financing_simulations IS 'Array de simulações de financiamento salvas para este lead';
