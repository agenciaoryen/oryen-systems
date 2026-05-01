-- ═══════════════════════════════════════════════════════════════════════════════
-- create_public_booking_slots.sql
-- Tabela para links públicos de agendamento (estilo Calendly).
-- Cada membro pode ter um link público onde clientes agendam horários.
-- slug: identificador único para o link público (/booking/:slug)
-- availability_config: JSON com dias/horários disponíveis
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public_booking_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  duration_minutes INT NOT NULL DEFAULT 30,
  buffer_minutes INT NOT NULL DEFAULT 0,
  availability_config JSONB NOT NULL DEFAULT '{"days": [1,2,3,4,5],"start_hour": 9,"end_hour": 18,"timezone": "America/Sao_Paulo"}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_booking_slots_org
  ON public_booking_slots(org_id);

CREATE INDEX IF NOT EXISTS idx_public_booking_slots_slug
  ON public_booking_slots(slug)
  WHERE is_active = TRUE;

-- RLS
ALTER TABLE public_booking_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_slots_select_org" ON public_booking_slots FOR SELECT USING (
  org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "booking_slots_insert_org" ON public_booking_slots FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "booking_slots_update_org" ON public_booking_slots FOR UPDATE USING (
  org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "booking_slots_delete_org" ON public_booking_slots FOR DELETE USING (
  org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
);

-- Política adicional para leitura pública pelo slug (sem auth)
-- Apenas campos necessários para exibição
CREATE POLICY "booking_slots_public_select" ON public_booking_slots FOR SELECT
  USING (is_active = TRUE);
