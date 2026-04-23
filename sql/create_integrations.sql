-- ═══════════════════════════════════════════════════════════════════════════════
-- Módulo: Integrações (Google Calendar sendo a primeira)
--
-- 1) Tabela integrations — guarda tokens OAuth encriptados por usuário/provider.
--    Extensível pra Outlook, Apple Calendar, etc. no futuro.
--
-- 2) ALTER calendar_events — marca origem de eventos espelhados (pull do Google)
--    e eventos originados na Oryen que foram empurrados pro Google (push).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Tabela integrations ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Qual integração é essa
  provider TEXT NOT NULL CHECK (provider IN ('google_calendar')),

  -- 'active'       → conectado e funcionando
  -- 'error'        → último sync falhou (token inválido, quota, etc)
  -- 'disconnected' → usuário revogou (registro mantido por histórico, pode ser deletado)
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error', 'disconnected')),

  -- Tokens OAuth — encriptados (AES-256-GCM) em aplicação antes de salvar.
  -- Nunca retornar esses campos pro cliente.
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],

  -- Identidade no lado do provider (pra mostrar na UI: "Conectado como fulano@gmail.com")
  provider_account_email TEXT,
  provider_account_name TEXT,

  -- Metadados específicos do provider (ex: IDs de calendários, primário, etc)
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Estado de sincronização
  last_sync_at TIMESTAMPTZ,
  last_sync_error TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Cada usuário só tem UMA integração ativa por provider
  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_integrations_org ON integrations(org_id);
CREATE INDEX IF NOT EXISTS idx_integrations_user_provider ON integrations(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status) WHERE status = 'active';

-- ─── RLS: integrations ─────────────────────────────────────────────────────────
-- Um usuário só enxerga as integrações dele mesmo. Tokens nunca voltam pro client
-- porque o route handler usa a service role pra ler — o client só recebe status/email.
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS integrations_select_own ON integrations;
CREATE POLICY integrations_select_own
  ON integrations FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS integrations_insert_own ON integrations;
CREATE POLICY integrations_insert_own
  ON integrations FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS integrations_update_own ON integrations;
CREATE POLICY integrations_update_own
  ON integrations FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS integrations_delete_own ON integrations;
CREATE POLICY integrations_delete_own
  ON integrations FOR DELETE
  USING (user_id = auth.uid());

-- ─── Trigger: updated_at ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION integrations_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_integrations_updated_at ON integrations;
CREATE TRIGGER trg_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION integrations_set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- ALTER calendar_events — campos de origem externa
--
-- external_source           'google_calendar' ou NULL
-- external_id               ID do evento no provider (Google Calendar event ID)
-- external_integration_id   FK pra integrations — identifica a conta dona do evento
-- external_read_only        TRUE = evento veio de fora e não deve ser editado/deletado
--                           pela Oryen (o usuário edita no Google)
--                           FALSE = evento nativo da Oryen que foi espelhado no Google
-- external_updated_at       Timestamp da última sincronização vinda do provider
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS external_source TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS external_integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_read_only BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS external_updated_at TIMESTAMPTZ;

-- UPSERT chave: mesma integração + mesmo external_id = mesmo evento
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_events_external_unique
  ON calendar_events(external_integration_id, external_id)
  WHERE external_id IS NOT NULL;

-- Busca de eventos externos (pra sync incremental e limpeza ao desconectar)
CREATE INDEX IF NOT EXISTS idx_calendar_events_external_integration
  ON calendar_events(external_integration_id)
  WHERE external_integration_id IS NOT NULL;
