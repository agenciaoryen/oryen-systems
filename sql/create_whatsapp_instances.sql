-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: whatsapp_instances
-- Mapeia cada instancia UAZAPI a uma org + agente
-- Fundamental para multi-tenant: webhook recebe mensagem → resolve org_id
-- Rodar no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,

  -- Dados da instancia UAZAPI
  instance_name TEXT NOT NULL,           -- nome da instancia na UAZAPI (ex: "imob_santiago_01")
  instance_token TEXT,                   -- token da instancia para envio
  api_url TEXT,                          -- URL base da API (ex: "https://api.uazapi.com")

  -- Numero conectado
  phone_number TEXT,                     -- numero conectado (ex: "5511999887766")
  display_name TEXT,                     -- nome exibido no WhatsApp

  -- Status
  status TEXT NOT NULL DEFAULT 'disconnected'  -- connected | disconnected | qr_pending | banned
    CHECK (status IN ('connected', 'disconnected', 'qr_pending', 'banned')),

  -- Configuracoes do agente SDR para esta instancia
  campaign_id UUID REFERENCES agent_campaigns(id) ON DELETE SET NULL,

  -- Metadata
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Uma org pode ter multiplas instancias, mas instance_name deve ser unico
  UNIQUE(instance_name)
);

-- Indices para lookup rapido no webhook
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_instance_name
  ON whatsapp_instances(instance_name);

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_org_id
  ON whatsapp_instances(org_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_phone_number
  ON whatsapp_instances(phone_number);

-- RLS: org so ve suas proprias instancias
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view own instances"
  ON whatsapp_instances FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Org admins can manage instances"
  ON whatsapp_instances FOR ALL
  USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_whatsapp_instances_updated_at
  BEFORE UPDATE ON whatsapp_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_instances_updated_at();
