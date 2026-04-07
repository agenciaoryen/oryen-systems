-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: WhatsApp Cloud API Support
-- Adiciona suporte dual (uazapi + Cloud API) na mesma infra
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══ B1: Alterar whatsapp_instances para suportar Cloud API ═══

ALTER TABLE whatsapp_instances
  ADD COLUMN IF NOT EXISTS api_type TEXT NOT NULL DEFAULT 'uazapi',
  ADD COLUMN IF NOT EXISTS waba_id TEXT,
  ADD COLUMN IF NOT EXISTS phone_number_id TEXT,
  ADD COLUMN IF NOT EXISTS cloud_api_token TEXT,
  ADD COLUMN IF NOT EXISTS business_id TEXT;

-- Constraint para api_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_instances_api_type_check'
  ) THEN
    ALTER TABLE whatsapp_instances
      ADD CONSTRAINT whatsapp_instances_api_type_check
      CHECK (api_type IN ('uazapi', 'cloud_api'));
  END IF;
END $$;

-- Index para lookups do webhook Cloud API (resolve instância por phone_number_id)
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_phone_number_id
  ON whatsapp_instances(phone_number_id)
  WHERE api_type = 'cloud_api';

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_waba_id
  ON whatsapp_instances(waba_id)
  WHERE api_type = 'cloud_api';

-- ═══ B2: Tabela whatsapp_templates ═══

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  waba_id TEXT NOT NULL,

  -- Identidade do template
  template_name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'pt_BR',
  category TEXT NOT NULL DEFAULT 'UTILITY'
    CHECK (category IN ('UTILITY', 'MARKETING', 'AUTHENTICATION')),

  -- Conteúdo
  header_text TEXT,
  body_text TEXT NOT NULL,
  footer_text TEXT,
  buttons JSONB,

  -- Sync com Meta
  meta_template_id TEXT,
  meta_status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (meta_status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED')),
  rejection_reason TEXT,

  -- Propósito (para lookup automático no follow-up)
  purpose TEXT
    CHECK (purpose IS NULL OR purpose IN ('follow_up', 'welcome', 'appointment_reminder', 'reengagement', 'custom')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 1 template por nome+idioma por WABA
  UNIQUE(waba_id, template_name, language)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_org
  ON whatsapp_templates(org_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_waba_status
  ON whatsapp_templates(waba_id, meta_status);

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_purpose
  ON whatsapp_templates(waba_id, purpose, meta_status)
  WHERE meta_status = 'APPROVED';

-- RLS
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view own templates"
  ON whatsapp_templates FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org admins can manage templates"
  ON whatsapp_templates FOR ALL
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')));

-- ═══ B3: Alterar follow_up_queue para suportar janela 24h ═══

ALTER TABLE follow_up_queue
  ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS template_name TEXT;

COMMENT ON COLUMN follow_up_queue.last_inbound_at IS 'Última msg recebida do lead — usado para calcular janela de 24h da Cloud API';
COMMENT ON COLUMN follow_up_queue.template_name IS 'Template a usar quando fora da janela 24h';
