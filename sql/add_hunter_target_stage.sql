-- ═══════════════════════════════════════════════════════════════════════════════
-- add_hunter_target_stage.sql
-- Adiciona campo target_stage ao campaign_config_schema do hunter_b2b.
-- Permite que o usuário escolha em qual estágio do funil os leads captados
-- serão inseridos (em vez do hardcoded 'novo').
--
-- Rodar no Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE agent_solutions
SET campaign_config_schema = jsonb_set(
  campaign_config_schema,
  '{fields}',
  (campaign_config_schema->'fields') || '[
    {
      "name": "target_stage",
      "type": "select",
      "required": false,
      "default": "novo",
      "label": {"pt": "Stage inicial do lead", "en": "Initial lead stage", "es": "Etapa inicial del lead"},
      "options": [],
      "description": {"pt": "Estágio do funil onde os leads captados serão inseridos. As opções são carregadas automaticamente do seu pipeline.", "en": "Pipeline stage where captured leads will be placed. Options are loaded from your pipeline.", "es": "Etapa del embudo donde se insertarán los leads captados. Las opciones se cargan desde tu pipeline."}
    }
  ]'::jsonb
),
updated_at = now()
WHERE slug = 'hunter_b2b';
