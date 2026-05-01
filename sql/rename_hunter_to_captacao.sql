-- ═══════════════════════════════════════════════════════════════════════════════
-- rename_hunter_to_captacao.sql
-- Renomeia o agent_solution 'hunter_b2b' visualmente para "Captação" em PT/EN/ES.
-- O slug `hunter_b2b` permanece (não é breaking change no código), só o nome
-- exibido no UI muda.
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE agent_solutions
SET name = '{
  "pt": "Captação B2B",
  "en": "B2B Capture",
  "es": "Captación B2B"
}'::jsonb,
description = '{
  "pt": "Capta leads B2B do Google e Google Maps com base em segmento + cidade. Extrai nome da empresa, telefone, email, site e Instagram. Cobertura sistemática: garante que todas as combinações de cidade × segmento sejam visitadas.",
  "en": "Captures B2B leads from Google and Google Maps based on segment + city. Extracts company name, phone, email, website and Instagram. Systematic coverage: ensures all city × segment combinations are visited.",
  "es": "Capta leads B2B de Google y Google Maps según segmento + ciudad. Extrae nombre de empresa, teléfono, email, sitio web e Instagram. Cobertura sistemática: garantiza que todas las combinaciones ciudad × segmento sean visitadas."
}'::jsonb,
icon = 'search'
WHERE slug = 'hunter_b2b';
