-- Registra o agent solution "BDR Email Prospector"
-- Pra aparecer no marketplace de agentes em /dashboard/agents.

INSERT INTO agent_solutions (
  slug, name, description, features, category, icon,
  price_monthly, price_setup, currency, stripe_price_id, stripe_setup_price_id,
  default_limits, campaign_config_schema, schedule_options,
  required_integrations, is_active, is_featured, sort_order
) VALUES (
  'bdr_email',

  '{"pt": "BDR Email", "en": "Email BDR", "es": "BDR por Email"}'::jsonb,

  '{"pt": "Agente de prospecção por email frio. Importa uma lista de contatos, gera um email personalizado pra cada um usando IA e dispara via Resend. Sem risco de ban, custo zero por email (plano gratuito do Resend cobre até 3k/mês).", "en": "Cold email prospecting agent. Imports a contact list, uses AI to write a personalized email for each one and sends via Resend. No ban risk, zero per-email cost (Resend free plan covers 3k/month).", "es": "Agente de prospección por email frío. Importa una lista de contactos, genera un email personalizado para cada uno usando IA y envía vía Resend. Sin riesgo de ban, costo cero por email."}'::jsonb,

  '[
    {"pt": "Upload de lista em CSV", "en": "CSV list upload", "es": "Carga de lista CSV"},
    {"pt": "Email gerado por IA pra cada contato", "en": "AI-generated email per contact", "es": "Email generado por IA por contacto"},
    {"pt": "Envio agendado com rate limit", "en": "Rate-limited scheduled delivery", "es": "Envío programado con rate limit"},
    {"pt": "Tracking de aberturas e cliques", "en": "Open and click tracking", "es": "Tracking de aperturas y clics"},
    {"pt": "Resposta vira lead automaticamente no CRM", "en": "Reply becomes a CRM lead automatically", "es": "Respuesta crea lead en el CRM automáticamente"}
  ]'::jsonb,

  'prospecting',
  'mail',
  0,
  0,
  'BRL',
  NULL,
  NULL,

  '{"emails_per_month": 3000, "campaigns_max": 10}'::jsonb,

  '{
    "fields": [
      {
        "name": "pitch_hook",
        "type": "textarea",
        "required": true,
        "label": {"pt": "Gancho da sua oferta", "en": "Your offer hook", "es": "Gancho de tu oferta"},
        "placeholder": {"pt": "Ex: Plataforma que qualifica leads imobiliários 24/7 via WhatsApp", "en": "Ex: Platform that qualifies real estate leads 24/7 via WhatsApp", "es": "Ej: Plataforma que califica leads inmobiliarios 24/7 vía WhatsApp"},
        "description": {"pt": "Uma frase curta descrevendo o problema que você resolve. A IA usa isso como base do email.", "en": "One short sentence describing the problem you solve. AI uses this as the email base.", "es": "Una frase corta describiendo el problema que resuelves. La IA usa eso como base del email."}
      },
      {
        "name": "sender_name",
        "type": "text",
        "required": true,
        "label": {"pt": "Nome do remetente", "en": "Sender name", "es": "Nombre del remitente"},
        "placeholder": {"pt": "Ex: Letie da Oryen", "en": "Ex: Jane from Acme", "es": "Ej: Juan de Acme"}
      },
      {
        "name": "call_to_action",
        "type": "text",
        "required": true,
        "label": {"pt": "CTA desejado", "en": "Desired CTA", "es": "CTA deseado"},
        "placeholder": {"pt": "Ex: Responder pra agendar 15 min de conversa", "en": "Ex: Reply to book a 15-min call", "es": "Ej: Responder para agendar 15 min de conversación"}
      },
      {
        "name": "tone",
        "type": "select",
        "required": true,
        "label": {"pt": "Tom de voz", "en": "Tone of voice", "es": "Tono de voz"},
        "default": "direto",
        "options": [
          {"value": "direto", "label": {"pt": "Direto e objetivo", "en": "Direct and objective", "es": "Directo y objetivo"}},
          {"value": "amigavel", "label": {"pt": "Amigável e consultivo", "en": "Friendly and consultative", "es": "Amigable y consultivo"}},
          {"value": "provocativo", "label": {"pt": "Provocativo (questiona status quo)", "en": "Provocative (challenges status quo)", "es": "Provocativo (cuestiona status quo)"}}
        ]
      },
      {
        "name": "emails_per_hour",
        "type": "number",
        "required": false,
        "label": {"pt": "Emails por hora", "en": "Emails per hour", "es": "Emails por hora"},
        "default": 30,
        "min": 5,
        "max": 100,
        "description": {"pt": "Quantos emails enviar por hora. Ritmo mais baixo = melhor deliverability. 30/h é equilibrado.", "en": "How many emails per hour. Lower pace = better deliverability. 30/h is balanced.", "es": "Cuántos emails por hora. Ritmo más bajo = mejor entrega. 30/h es equilibrado."}
      }
    ]
  }'::jsonb,

  '{
    "frequencies": ["manual"],
    "default_frequency": "manual",
    "default_time": "09:00",
    "min_interval_hours": 1
  }'::jsonb,

  ARRAY[]::text[],

  true,
  true,
  50
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  campaign_config_schema = EXCLUDED.campaign_config_schema,
  updated_at = now();
