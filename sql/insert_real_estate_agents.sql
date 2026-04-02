-- ═══════════════════════════════════════════════════════════════════════════════
-- INSERT: SDR Imobiliário + Follow-up Imobiliário
-- Agentes exclusivos para o nicho real_estate (corretores e imobiliárias)
-- Rodar no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1) SDR Imobiliário
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
  stripe_price_id,
  stripe_setup_price_id,
  default_limits,
  campaign_config_schema,
  schedule_options,
  required_integrations,
  is_active,
  is_featured,
  sort_order
) VALUES (
  'sdr_imobiliario',

  -- name (pt, en, es)
  '{"pt": "SDR Imobiliário", "en": "Real Estate SDR", "es": "SDR Inmobiliario"}'::jsonb,

  -- description
  '{"pt": "Agente inteligente que prospecta leads qualificados para corretores e imobiliárias. Busca contatos interessados em compra, venda ou aluguel de imóveis na sua região, qualifica automaticamente e entrega leads prontos para abordagem.", "en": "Smart agent that prospects qualified leads for real estate agents and agencies. Searches for contacts interested in buying, selling or renting properties in your region, auto-qualifies and delivers leads ready for outreach.", "es": "Agente inteligente que prospecta leads calificados para corredores e inmobiliarias. Busca contactos interesados en compra, venta o arriendo de inmuebles en tu región, califica automáticamente y entrega leads listos para abordaje."}'::jsonb,

  -- features
  '[
    {"pt": "Prospecção automática de leads imobiliários", "en": "Automatic real estate lead prospecting", "es": "Prospección automática de leads inmobiliarios"},
    {"pt": "Filtros por região, tipo de imóvel e faixa de preço", "en": "Filters by region, property type and price range", "es": "Filtros por región, tipo de inmueble y rango de precio"},
    {"pt": "Qualificação inteligente com scoring", "en": "Smart qualification with scoring", "es": "Calificación inteligente con scoring"},
    {"pt": "Enriquecimento de dados de contato", "en": "Contact data enrichment", "es": "Enriquecimiento de datos de contacto"},
    {"pt": "Integração direta com o CRM Oryen", "en": "Direct integration with Oryen CRM", "es": "Integración directa con el CRM Oryen"}
  ]'::jsonb,

  'prospecting',
  'message-square',
  197,
  0,
  'BRL',
  NULL,
  NULL,

  -- default_limits
  '{"leads_per_month": 500, "campaigns_max": 5}'::jsonb,

  -- campaign_config_schema
  '{
    "fields": [
      {
        "name": "target_region",
        "type": "text",
        "required": true,
        "label": {"pt": "Região alvo", "en": "Target region", "es": "Región objetivo"},
        "placeholder": {"pt": "Ex: São Paulo - Zona Sul, Alphaville", "en": "Ex: São Paulo - South Zone", "es": "Ej: São Paulo - Zona Sur"},
        "description": {"pt": "Bairros, cidades ou regiões onde deseja prospectar", "en": "Neighborhoods, cities or regions to prospect", "es": "Barrios, ciudades o regiones donde desea prospectar"}
      },
      {
        "name": "property_type",
        "type": "select",
        "required": true,
        "label": {"pt": "Tipo de imóvel", "en": "Property type", "es": "Tipo de inmueble"},
        "options": [
          {"value": "residential", "label": {"pt": "Residencial", "en": "Residential", "es": "Residencial"}},
          {"value": "commercial", "label": {"pt": "Comercial", "en": "Commercial", "es": "Comercial"}},
          {"value": "land", "label": {"pt": "Terrenos", "en": "Land", "es": "Terrenos"}},
          {"value": "all", "label": {"pt": "Todos", "en": "All", "es": "Todos"}}
        ],
        "default": "residential"
      },
      {
        "name": "transaction_type",
        "type": "select",
        "required": true,
        "label": {"pt": "Tipo de transação", "en": "Transaction type", "es": "Tipo de transacción"},
        "options": [
          {"value": "sale", "label": {"pt": "Venda", "en": "Sale", "es": "Venta"}},
          {"value": "rent", "label": {"pt": "Aluguel", "en": "Rent", "es": "Arriendo"}},
          {"value": "both", "label": {"pt": "Ambos", "en": "Both", "es": "Ambos"}}
        ],
        "default": "sale"
      },
      {
        "name": "price_range",
        "type": "text",
        "required": false,
        "label": {"pt": "Faixa de preço", "en": "Price range", "es": "Rango de precio"},
        "placeholder": {"pt": "Ex: R$ 300k - R$ 800k", "en": "Ex: $300k - $800k", "es": "Ej: $300k - $800k"},
        "description": {"pt": "Faixa de preço dos imóveis que seus clientes buscam", "en": "Price range of properties your clients are looking for", "es": "Rango de precio de los inmuebles que sus clientes buscan"}
      },
      {
        "name": "ideal_client_profile",
        "type": "textarea",
        "required": false,
        "label": {"pt": "Perfil do cliente ideal", "en": "Ideal client profile", "es": "Perfil del cliente ideal"},
        "placeholder": {"pt": "Descreva o perfil de cliente que você busca...", "en": "Describe the client profile you are looking for...", "es": "Describa el perfil de cliente que busca..."},
        "description": {"pt": "Quanto mais detalhado, melhores os resultados da prospecção", "en": "The more detailed, the better the prospecting results", "es": "Cuanto más detallado, mejores los resultados de la prospección"}
      },
      {
        "name": "leads_per_run",
        "type": "number",
        "required": false,
        "label": {"pt": "Leads por execução", "en": "Leads per run", "es": "Leads por ejecución"},
        "default": 10,
        "min": 1,
        "max": 50,
        "description": {"pt": "Quantidade de leads para buscar por execução", "en": "Number of leads to fetch per run", "es": "Cantidad de leads para buscar por ejecución"}
      }
    ]
  }'::jsonb,

  -- schedule_options
  '{
    "frequencies": ["daily", "weekly", "manual"],
    "default_frequency": "daily",
    "default_time": "09:00",
    "min_interval_hours": 12
  }'::jsonb,

  ARRAY[]::text[],
  true,
  true,
  10
);


-- 2) Follow-up Imobiliário
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
  stripe_price_id,
  stripe_setup_price_id,
  default_limits,
  campaign_config_schema,
  schedule_options,
  required_integrations,
  is_active,
  is_featured,
  sort_order
) VALUES (
  'followup_imobiliario',

  -- name
  '{"pt": "Follow-up Imobiliário", "en": "Real Estate Follow-up", "es": "Follow-up Inmobiliario"}'::jsonb,

  -- description
  '{"pt": "Agente de follow-up automático que reengaja leads inativos ou em negociação. Envia mensagens personalizadas por WhatsApp ou e-mail, mantendo o relacionamento aquecido até o fechamento do negócio.", "en": "Automatic follow-up agent that re-engages inactive or in-negotiation leads. Sends personalized messages via WhatsApp or email, keeping the relationship warm until deal closure.", "es": "Agente de follow-up automático que re-engancha leads inactivos o en negociación. Envía mensajes personalizados por WhatsApp o email, manteniendo la relación activa hasta el cierre del negocio."}'::jsonb,

  -- features
  '[
    {"pt": "Follow-up automático por WhatsApp e e-mail", "en": "Automatic follow-up via WhatsApp and email", "es": "Follow-up automático por WhatsApp y email"},
    {"pt": "Mensagens personalizadas com IA por lead", "en": "AI-personalized messages per lead", "es": "Mensajes personalizados con IA por lead"},
    {"pt": "Cadência inteligente baseada no estágio do funil", "en": "Smart cadence based on funnel stage", "es": "Cadencia inteligente basada en la etapa del embudo"},
    {"pt": "Detecção de melhor horário para contato", "en": "Best contact time detection", "es": "Detección del mejor horario para contacto"},
    {"pt": "Relatórios de engajamento e conversão", "en": "Engagement and conversion reports", "es": "Reportes de engagement y conversión"}
  ]'::jsonb,

  'conversation',
  'clock',
  147,
  0,
  'BRL',
  NULL,
  NULL,

  -- default_limits
  '{"leads_per_month": 1000, "campaigns_max": 10}'::jsonb,

  -- campaign_config_schema
  '{
    "fields": [
      {
        "name": "campaign_goal",
        "type": "select",
        "required": true,
        "label": {"pt": "Objetivo da campanha", "en": "Campaign goal", "es": "Objetivo de la campaña"},
        "options": [
          {"value": "reactivate", "label": {"pt": "Reativar leads frios", "en": "Reactivate cold leads", "es": "Reactivar leads fríos"}},
          {"value": "nurture", "label": {"pt": "Nutrir leads em negociação", "en": "Nurture leads in negotiation", "es": "Nutrir leads en negociación"}},
          {"value": "post_visit", "label": {"pt": "Pós-visita ao imóvel", "en": "Post property visit", "es": "Post-visita al inmueble"}},
          {"value": "seasonal", "label": {"pt": "Campanha sazonal", "en": "Seasonal campaign", "es": "Campaña estacional"}}
        ],
        "default": "reactivate"
      },
      {
        "name": "channel",
        "type": "select",
        "required": true,
        "label": {"pt": "Canal de contato", "en": "Contact channel", "es": "Canal de contacto"},
        "options": [
          {"value": "whatsapp", "label": "WhatsApp"},
          {"value": "email", "label": "E-mail"},
          {"value": "both", "label": {"pt": "Ambos", "en": "Both", "es": "Ambos"}}
        ],
        "default": "whatsapp"
      },
      {
        "name": "message_tone",
        "type": "select",
        "required": false,
        "label": {"pt": "Tom da mensagem", "en": "Message tone", "es": "Tono del mensaje"},
        "options": [
          {"value": "professional", "label": {"pt": "Profissional", "en": "Professional", "es": "Profesional"}},
          {"value": "friendly", "label": {"pt": "Amigável", "en": "Friendly", "es": "Amigable"}},
          {"value": "urgent", "label": {"pt": "Urgente / Escassez", "en": "Urgent / Scarcity", "es": "Urgente / Escasez"}}
        ],
        "default": "professional"
      },
      {
        "name": "followup_interval_days",
        "type": "number",
        "required": true,
        "label": {"pt": "Intervalo entre follow-ups (dias)", "en": "Follow-up interval (days)", "es": "Intervalo entre follow-ups (días)"},
        "default": 3,
        "min": 1,
        "max": 30,
        "description": {"pt": "Dias entre cada mensagem de follow-up", "en": "Days between each follow-up message", "es": "Días entre cada mensaje de follow-up"}
      },
      {
        "name": "max_attempts",
        "type": "number",
        "required": true,
        "label": {"pt": "Máximo de tentativas", "en": "Max attempts", "es": "Máximo de intentos"},
        "default": 5,
        "min": 1,
        "max": 15,
        "description": {"pt": "Número máximo de follow-ups por lead", "en": "Maximum follow-ups per lead", "es": "Número máximo de follow-ups por lead"}
      },
      {
        "name": "target_stages",
        "type": "tags",
        "required": false,
        "label": {"pt": "Estágios do funil para incluir", "en": "Funnel stages to include", "es": "Etapas del embudo a incluir"},
        "placeholder": {"pt": "Ex: Qualificação, Proposta, Visita", "en": "Ex: Qualification, Proposal, Visit", "es": "Ej: Calificación, Propuesta, Visita"},
        "description": {"pt": "Filtre quais leads receberão follow-up pelo estágio no CRM", "en": "Filter which leads will receive follow-up by CRM stage", "es": "Filtre qué leads recibirán follow-up por etapa en el CRM"}
      },
      {
        "name": "custom_message_template",
        "type": "textarea",
        "required": false,
        "label": {"pt": "Template personalizado (opcional)", "en": "Custom template (optional)", "es": "Template personalizado (opcional)"},
        "placeholder": {"pt": "Olá {nome}, tudo bem? Vi que você se interessou pelo imóvel em {bairro}...", "en": "Hi {name}, I noticed you were interested in the property at {neighborhood}...", "es": "Hola {nombre}, vi que te interesaste por el inmueble en {barrio}..."},
        "description": {"pt": "Use {nome}, {imovel}, {bairro}, {preco} como variáveis. Se vazio, a IA gera automaticamente.", "en": "Use {name}, {property}, {neighborhood}, {price} as variables. If empty, AI generates automatically.", "es": "Use {nombre}, {inmueble}, {barrio}, {precio} como variables. Si vacío, la IA genera automáticamente."}
      }
    ]
  }'::jsonb,

  -- schedule_options
  '{
    "frequencies": ["hourly", "daily", "weekly", "manual"],
    "default_frequency": "daily",
    "default_time": "10:00",
    "min_interval_hours": 4
  }'::jsonb,

  ARRAY['whatsapp']::text[],
  true,
  true,
  11
);
