-- ═══════════════════════════════════════════════════════════════════════════════
-- hunter_b2b_setup.sql
-- Setup do agente Hunter B2B local (substitui o webhook n8n).
--
-- 1. Tabela `hunter_search_cursor`:
--    Persiste estado de cobertura cidade × segmento × estratégia por campanha.
--    Em vez de sortear aleatoriamente (e correr risco de cobrir só algumas
--    combinações), o runner pega sempre a combinação com last_run_at mais
--    antigo. Garante cobertura sistemática.
--
-- 2. Insert do agent_solution `hunter_b2b` no catálogo (idempotente).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- TABELA: hunter_search_cursor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hunter_search_cursor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES agent_campaigns(id) ON DELETE CASCADE,

  city text NOT NULL,
  segment text NOT NULL,
  search_strategy text NOT NULL DEFAULT 'general'
    CHECK (search_strategy IN ('general', 'instagram', 'google_maps')),

  -- Tracking
  last_run_at timestamptz,
  total_runs int NOT NULL DEFAULT 0,
  leads_found int NOT NULL DEFAULT 0,
  leads_saved int NOT NULL DEFAULT 0,
  leads_duplicated int NOT NULL DEFAULT 0,
  last_error text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(campaign_id, city, segment, search_strategy)
);

-- Índice pra picker do runner: pega a combinação mais "esquecida"
CREATE INDEX IF NOT EXISTS idx_hunter_cursor_picker
  ON hunter_search_cursor(campaign_id, last_run_at NULLS FIRST);

-- RLS: mesma política das outras tabelas de agents (org via campaign)
ALTER TABLE hunter_search_cursor ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hunter_cursor_access ON hunter_search_cursor;
CREATE POLICY hunter_cursor_access ON hunter_search_cursor
  FOR ALL
  USING (
    campaign_id IN (
      SELECT id FROM agent_campaigns
      WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'staff'
  );

-- Updated_at automático
CREATE OR REPLACE FUNCTION touch_hunter_cursor_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hunter_cursor_updated ON hunter_search_cursor;
CREATE TRIGGER trg_hunter_cursor_updated
  BEFORE UPDATE ON hunter_search_cursor
  FOR EACH ROW EXECUTE FUNCTION touch_hunter_cursor_updated_at();

COMMENT ON TABLE hunter_search_cursor IS
  'Cursor de cobertura sistemática por campanha. Cada (city, segment, strategy) é uma combinação. Runner pega sempre a com last_run_at mais antigo (NULLS FIRST = nunca rodada).';


-- ─────────────────────────────────────────────────────────────────────────────
-- AGENT SOLUTION: hunter_b2b
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO agent_solutions (
  slug,
  name,
  description,
  features,
  category,
  icon,
  price_monthly,
  price_setup,
  currency,
  default_limits,
  campaign_config_schema,
  schedule_options,
  required_integrations,
  is_active,
  is_featured,
  sort_order
) VALUES (
  'hunter_b2b',

  '{"pt": "Hunter B2B", "en": "B2B Hunter", "es": "Hunter B2B"}'::jsonb,

  '{"pt": "Capta leads B2B do Google e Google Maps com base em segmento + cidade. Extrai nome da empresa, telefone, email, site e Instagram. Cobertura sistemática: garante que todas as combinações de cidade × segmento sejam visitadas.", "en": "Captures B2B leads from Google and Google Maps based on segment + city. Extracts company name, phone, email, website and Instagram. Systematic coverage: ensures all city × segment combinations are visited.", "es": "Capta leads B2B de Google y Google Maps según segmento + ciudad. Extrae nombre de empresa, teléfono, email, sitio web e Instagram. Cobertura sistemática: garantiza que todas las combinaciones ciudad × segmento sean visitadas."}'::jsonb,

  '[
    {"pt": "Captação local sem dependência de n8n", "en": "Local capture without n8n", "es": "Captación local sin n8n"},
    {"pt": "3 estratégias: Google geral, Google Maps, Instagram", "en": "3 strategies: general Google, Google Maps, Instagram", "es": "3 estrategias: Google general, Google Maps, Instagram"},
    {"pt": "Enriquecimento: scraping de site quando falta contato", "en": "Enrichment: site scraping when contact is missing", "es": "Enriquecimiento: scraping del sitio cuando falta contacto"},
    {"pt": "Cobertura sistemática (sem aleatoriedade)", "en": "Systematic coverage (no randomness)", "es": "Cobertura sistemática (sin aleatoriedad)"},
    {"pt": "Round-robin entre múltiplas API keys do Serper", "en": "Round-robin across multiple Serper API keys", "es": "Round-robin entre múltiples API keys de Serper"},
    {"pt": "Normalização de telefone por país (CL/BR/AR/MX/CO/PE)", "en": "Phone normalization per country", "es": "Normalización de teléfono por país"}
  ]'::jsonb,

  'prospecting',
  'target',
  97,
  0,
  'BRL',

  -- default_limits
  '{"leads_per_month": 1000, "campaigns_max": 5}'::jsonb,

  -- campaign_config_schema — campos da campanha
  '{
    "fields": [
      {
        "name": "search_strategy",
        "type": "select",
        "required": true,
        "label": {"pt": "Estratégia de busca", "en": "Search strategy", "es": "Estrategia de búsqueda"},
        "options": [
          {"value": "general", "label": {"pt": "Google geral", "en": "General Google", "es": "Google general"}},
          {"value": "google_maps", "label": {"pt": "Google Maps (recomendado)", "en": "Google Maps (recommended)", "es": "Google Maps (recomendado)"}},
          {"value": "instagram", "label": {"pt": "Instagram", "en": "Instagram", "es": "Instagram"}}
        ],
        "default": "google_maps",
        "description": {"pt": "Maps entrega telefone estruturado, geral é mais flexível, Instagram é bom pra microempresas", "en": "Maps gives structured phones, general is more flexible, Instagram is good for micro-businesses", "es": "Maps entrega teléfonos estructurados, general es más flexible, Instagram es bueno para microempresas"}
      },
      {
        "name": "locations",
        "type": "tags",
        "required": true,
        "label": {"pt": "Cidades", "en": "Cities", "es": "Ciudades"},
        "placeholder": {"pt": "Digite uma cidade e pressione Enter", "en": "Type a city and press Enter", "es": "Escriba una ciudad y presione Enter"},
        "description": {"pt": "Cada cidade × segmento vira uma combinação a ser percorrida", "en": "Each city × segment becomes a combination to cover", "es": "Cada ciudad × segmento se convierte en una combinación a cubrir"}
      },
      {
        "name": "business_type",
        "type": "tags",
        "required": true,
        "label": {"pt": "Segmentos / nichos", "en": "Segments / niches", "es": "Segmentos / nichos"},
        "placeholder": {"pt": "Ex: pizzaria, dentista, advogado", "en": "Ex: pizzeria, dentist, lawyer", "es": "Ej: pizzería, dentista, abogado"}
      },
      {
        "name": "keywords",
        "type": "tags",
        "required": false,
        "label": {"pt": "Palavras-chave extras", "en": "Extra keywords", "es": "Palabras clave extra"},
        "placeholder": {"pt": "Ex: delivery, 24h, premium", "en": "Ex: delivery, 24h, premium", "es": "Ej: delivery, 24h, premium"}
      },
      {
        "name": "exclude_keywords",
        "type": "tags",
        "required": false,
        "label": {"pt": "Excluir resultados com", "en": "Exclude results with", "es": "Excluir resultados con"},
        "placeholder": {"pt": "Ex: vagas, emprego", "en": "Ex: jobs, careers", "es": "Ej: empleos, vacantes"}
      },
      {
        "name": "scrape_websites",
        "type": "boolean",
        "required": false,
        "default": true,
        "label": {"pt": "Enriquecer com scraping de site", "en": "Enrich with website scraping", "es": "Enriquecer con scraping del sitio"},
        "description": {"pt": "Quando o lead tem site mas não tem email/telefone, faz fetch da página para extrair contato. Adiciona ~500ms por lead.", "en": "When lead has website but no email/phone, fetch the page to extract contact. Adds ~500ms per lead.", "es": "Cuando el lead tiene sitio pero no email/teléfono, hace fetch para extraer contacto. Agrega ~500ms por lead."}
      },
      {
        "name": "leads_per_run",
        "type": "number",
        "required": false,
        "label": {"pt": "Leads por execução", "en": "Leads per run", "es": "Leads por ejecución"},
        "default": 10,
        "min": 1,
        "max": 30
      }
    ]
  }'::jsonb,

  '{
    "frequencies": ["hourly", "daily", "weekly", "manual"],
    "default_frequency": "daily",
    "default_time": "09:00",
    "min_interval_hours": 1
  }'::jsonb,

  ARRAY[]::text[],
  true,
  true,
  20
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  campaign_config_schema = EXCLUDED.campaign_config_schema,
  schedule_options = EXCLUDED.schedule_options,
  is_active = EXCLUDED.is_active,
  updated_at = now();

COMMENT ON COLUMN agent_solutions.slug IS
  'hunter_b2b agora roda 100% local (lib/agents/hunter/runner.ts). Sem dependência de n8n.';
