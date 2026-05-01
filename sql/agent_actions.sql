-- ═══════════════════════════════════════════════════════════════════════════════
-- agent_actions.sql
-- Audit log central da execução de agentes IA.
--
-- Toda ação executada pelo kernel (lib/agents/kernel.ts → runAgentCapability)
-- registra UMA linha aqui. É a "folha de ponto" do colaborador IA — fonte
-- única de verdade sobre o que cada agente fez, quando, com qual resultado.
--
-- Substitui (no longo prazo) a fragmentação atual em:
--   - prospection_step_executions
--   - agent_runs (parcial — runs ainda agregam sub-ações)
--   - sdr_messages (continua tabela de domínio, mas refletida aqui)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,

  -- ─── Identificação da ação ─────────────────────────────────────────────
  capability text NOT NULL,
    -- Slug da capability executada: 'send_email', 'reply_whatsapp',
    -- 'classify_intent', 'capture_lead', etc.

  kind text NOT NULL CHECK (kind IN ('worker', 'agent')),
    -- worker = determinístico (envio, persistência, leitura)
    --          baixo custo, alta confiabilidade
    -- agent  = uso de LLM (geração, decisão, classificação)
    --          alto custo, falível

  -- ─── Target polimórfico (contra quem/o-que a ação foi executada) ────────
  target_type text,
    -- 'lead', 'deal', 'message', 'task', 'enrollment', null pro contexto-agnóstico
  target_id uuid,

  -- ─── Trigger (quem mandou executar) ─────────────────────────────────────
  triggered_by_type text NOT NULL
    CHECK (triggered_by_type IN ('user', 'system', 'agent', 'cron', 'webhook')),
  triggered_by_id uuid,
    -- user.id, parent agent.id, null pra system/cron/webhook
  triggered_by_label text,
    -- descrição humana opcional ("cron prospection 15min", "webhook UAZAPI")

  -- ─── Estado ────────────────────────────────────────────────────────────
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'failed', 'skipped', 'denied')),

  denied_reason text,
    -- Quando status='denied': 'plan', 'org_inactive', 'agent_paused',
    -- 'agent_inactive', 'capability_not_in_catalog', 'quota_exceeded', etc.

  -- ─── Timing ────────────────────────────────────────────────────────────
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms int,

  -- ─── IO ────────────────────────────────────────────────────────────────
  input jsonb DEFAULT '{}'::jsonb,
    -- Payload da chamada SANITIZADO. Não armazenar tokens/segredos.
  result jsonb,
    -- Output da capability. Estrutura depende do handler.
  error_message text,
    -- Quando status='failed': mensagem do erro (curta).
  error_stack text,
    -- Stack trace completo (opcional, debugging).

  -- ─── Aprovação humana (modo supervisão) ────────────────────────────────
  -- Quando uma capability requer aprovação humana antes de side-effects
  -- (ex: send_email em modo supervisão), o action fica em 'running' até
  -- approval_status='approved'. Default 'auto' = sem aprovação requerida.
  approval_status text NOT NULL DEFAULT 'auto'
    CHECK (approval_status IN ('auto', 'pending', 'approved', 'rejected')),
  approved_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejection_reason text,

  -- ─── Linhagem (handoff entre agentes/capabilities) ─────────────────────
  parent_action_id uuid REFERENCES agent_actions(id) ON DELETE SET NULL,
    -- Quando uma capability dispara outra (handoff), a filha referencia
    -- a pai. Permite reconstruir a cadeia de "porque essa ação aconteceu".

  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Índices ────────────────────────────────────────────────────────────────

-- Dashboard "atividade da org"
CREATE INDEX IF NOT EXISTS idx_agent_actions_org_started
  ON agent_actions(org_id, started_at DESC);

-- "Atividade deste colaborador" (perfil do agente)
CREATE INDEX IF NOT EXISTS idx_agent_actions_agent_started
  ON agent_actions(agent_id, started_at DESC)
  WHERE agent_id IS NOT NULL;

-- "Tudo que aconteceu com este lead/deal/etc"
CREATE INDEX IF NOT EXISTS idx_agent_actions_target
  ON agent_actions(target_type, target_id, started_at DESC)
  WHERE target_id IS NOT NULL;

-- Métricas por capability (taxa de sucesso, custo, etc)
CREATE INDEX IF NOT EXISTS idx_agent_actions_capability_status
  ON agent_actions(capability, status, started_at DESC);

-- Inbox de aprovações pendentes
CREATE INDEX IF NOT EXISTS idx_agent_actions_pending_approval
  ON agent_actions(org_id, approval_status, started_at DESC)
  WHERE approval_status = 'pending';

-- ─── Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_actions_select ON agent_actions;
CREATE POLICY agent_actions_select ON agent_actions
  FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'staff'
  );

-- Inserts/updates só via service_role (kernel). User não escreve direto.
DROP POLICY IF EXISTS agent_actions_service_all ON agent_actions;
CREATE POLICY agent_actions_service_all ON agent_actions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Admin pode aprovar/rejeitar actions pendentes da própria org
DROP POLICY IF EXISTS agent_actions_admin_approve ON agent_actions;
CREATE POLICY agent_actions_admin_approve ON agent_actions
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
    AND approval_status = 'pending'
  );

COMMENT ON TABLE agent_actions IS
  'Audit log central de execução de agentes IA. Toda ação do kernel registra aqui.';
COMMENT ON COLUMN agent_actions.kind IS
  'worker = determinístico/barato; agent = usa LLM/criativo. Separar viabiliza métricas de custo precisas.';
COMMENT ON COLUMN agent_actions.approval_status IS
  'auto = sem aprovação requerida. pending = aguardando humano (Manus Computer style intervention).';
COMMENT ON COLUMN agent_actions.parent_action_id IS
  'Linhagem do handoff. Permite reconstruir a cadeia de causa entre ações.';
