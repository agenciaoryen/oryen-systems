-- ═══════════════════════════════════════════════════════════════════════════════
-- insert_generic_agents.sql
-- Cria agent_solutions genéricos (sem sufixo _imobiliario) pra orgs que
-- não são real_estate (ai_agency e nichos futuros).
--
-- Hoje só existiam variantes _imobiliario que ficavam escondidas em outros
-- nichos pelo filtro do UI. Resultado: org agency_ai não via Follow-up nem
-- SDR pra contratar.
--
-- Estes agent_solutions usam o MESMO runner (lib/sdr/follow-up-prompt.ts já
-- ramifica por org.niche; SDR usa o mesmo /api/sdr/process). A diferença é
-- só o nome/descrição apresentados no UI.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1) SDR genérico (B2B / Tech / Agency)
INSERT INTO agent_solutions (
  slug, name, description, features, category, icon,
  price_monthly, price_setup, currency,
  default_limits, campaign_config_schema, schedule_options,
  required_integrations, is_active, is_featured, sort_order
) VALUES (
  'sdr',
  '{"pt": "SDR", "en": "SDR", "es": "SDR"}'::jsonb,
  '{"pt": "Agente que qualifica leads via WhatsApp 24/7. Responde dúvidas, agenda reuniões e mantém o relacionamento aquecido até o lead estar pronto pra negociação.", "en": "Agent that qualifies leads via WhatsApp 24/7. Answers questions, schedules meetings and keeps the relationship warm until the lead is ready for negotiation.", "es": "Agente que califica leads vía WhatsApp 24/7. Responde dudas, agenda reuniones y mantiene la relación activa hasta que el lead esté listo para negociar."}'::jsonb,
  '[
    {"pt": "Atendimento 24/7 no WhatsApp", "en": "24/7 WhatsApp attendance", "es": "Atención 24/7 en WhatsApp"},
    {"pt": "Qualificação inteligente com scoring", "en": "Smart qualification with scoring", "es": "Calificación inteligente con scoring"},
    {"pt": "Agendamento de reuniões automático", "en": "Automatic meeting scheduling", "es": "Agendamiento automático de reuniones"},
    {"pt": "Detecção de intenção e estágio do funil", "en": "Intent and funnel-stage detection", "es": "Detección de intención y etapa del embudo"},
    {"pt": "Integração com CRM Oryen", "en": "Oryen CRM integration", "es": "Integración con CRM Oryen"}
  ]'::jsonb,
  'conversation', 'message-square', 197, 0, 'BRL',
  '{"messages_per_month": 5000, "campaigns_max": 3}'::jsonb,
  '{
    "fields": [
      {
        "name": "assistant_name",
        "type": "text",
        "required": true,
        "label": {"pt": "Nome do assistente", "en": "Assistant name", "es": "Nombre del asistente"},
        "placeholder": {"pt": "Ex: Ana, João", "en": "Ex: Ana, John", "es": "Ej: Ana, Juan"}
      },
      {
        "name": "company_context",
        "type": "textarea",
        "required": false,
        "label": {"pt": "Contexto da empresa", "en": "Company context", "es": "Contexto de la empresa"},
        "placeholder": {"pt": "Quem você é, o que vende, pra quem...", "en": "Who you are, what you sell, to whom...", "es": "Quién es, qué vende, para quién..."}
      },
      {
        "name": "tone",
        "type": "select",
        "required": false,
        "label": {"pt": "Tom de voz", "en": "Tone", "es": "Tono"},
        "options": [
          {"value": "casual", "label": {"pt": "Casual", "en": "Casual", "es": "Casual"}},
          {"value": "professional", "label": {"pt": "Profissional", "en": "Professional", "es": "Profesional"}},
          {"value": "formal", "label": {"pt": "Formal", "en": "Formal", "es": "Formal"}},
          {"value": "technical", "label": {"pt": "Técnico", "en": "Technical", "es": "Técnico"}}
        ],
        "default": "professional"
      }
    ]
  }'::jsonb,
  '{"frequencies": ["realtime"], "default_frequency": "realtime"}'::jsonb,
  ARRAY[]::text[], true, true, 5
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  campaign_config_schema = EXCLUDED.campaign_config_schema,
  is_active = EXCLUDED.is_active,
  updated_at = now();


-- 2) Follow-up genérico (B2B / Tech / Agency)
INSERT INTO agent_solutions (
  slug, name, description, features, category, icon,
  price_monthly, price_setup, currency,
  default_limits, campaign_config_schema, schedule_options,
  required_integrations, is_active, is_featured, sort_order
) VALUES (
  'followup',
  '{"pt": "Follow-up", "en": "Follow-up", "es": "Follow-up"}'::jsonb,
  '{"pt": "Agente que reativa leads em silêncio com mensagens personalizadas em sequência inteligente. Detecta automaticamente quem parou de responder e retoma a conversa de forma natural — sem ser invasivo.", "en": "Agent that re-engages silent leads with personalized messages in a smart sequence. Auto-detects who stopped replying and resumes the conversation naturally — without being intrusive.", "es": "Agente que reactiva leads en silencio con mensajes personalizados en secuencia inteligente. Detecta automáticamente quién dejó de responder y retoma la conversación de forma natural — sin ser invasivo."}'::jsonb,
  '[
    {"pt": "Detecção automática de leads silenciosos", "en": "Automatic silent-lead detection", "es": "Detección automática de leads silenciosos"},
    {"pt": "Cadência inteligente (5 tentativas em janelas crescentes)", "en": "Smart cadence (5 attempts in growing windows)", "es": "Cadencia inteligente (5 intentos en ventanas crecientes)"},
    {"pt": "Mensagens personalizadas por estágio do funil", "en": "Stage-aware personalized messages", "es": "Mensajes personalizados por etapa del embudo"},
    {"pt": "Respeita horário comercial configurável", "en": "Respects configurable business hours", "es": "Respeta horario comercial configurable"},
    {"pt": "Pausa automática quando o lead responde", "en": "Auto-pause when lead replies", "es": "Pausa automática cuando el lead responde"}
  ]'::jsonb,
  'conversation', 'clock', 147, 0, 'BRL',
  '{"messages_per_month": 3000, "campaigns_max": 5}'::jsonb,
  '{
    "fields": [
      {
        "name": "assistant_name",
        "type": "text",
        "required": true,
        "label": {"pt": "Nome do assistente", "en": "Assistant name", "es": "Nombre del asistente"},
        "placeholder": {"pt": "Ex: Ana, João", "en": "Ex: Ana, John", "es": "Ej: Ana, Juan"}
      },
      {
        "name": "company_context",
        "type": "textarea",
        "required": false,
        "label": {"pt": "Contexto da empresa", "en": "Company context", "es": "Contexto de la empresa"},
        "placeholder": {"pt": "O que vende, pra quem, qual o diferencial...", "en": "What you sell, to whom, your differential...", "es": "Qué vende, para quién, su diferencial..."}
      }
    ]
  }'::jsonb,
  '{"frequencies": ["hourly"], "default_frequency": "hourly"}'::jsonb,
  ARRAY[]::text[], true, true, 6
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  campaign_config_schema = EXCLUDED.campaign_config_schema,
  is_active = EXCLUDED.is_active,
  updated_at = now();
