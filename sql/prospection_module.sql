-- ═══════════════════════════════════════════════════════════════════════════════
-- MÓDULO DE PROSPECÇÃO MULTI-CANAL
-- ═══════════════════════════════════════════════════════════════════════════════
-- Cadência WhatsApp + Email + Ligação + Último Toque com qualificação ICUVA.
--
-- Conceitos:
--   • Sequence: template de cadência (admin cria por org)
--   • Step: etapa da sequence (canal + dia + executor + mensagens)
--   • Enrollment Rule: como o lead entra automaticamente numa sequence
--   • Enrollment: o lead dentro de uma sequence
--   • Task: ação acionável gerada dos steps manuais
--   • Step Execution: log de execuções (analytics)
--
-- Gating: somente orgs com niche='ai_agency' acessam. Real_estate é bloqueado
-- tanto via RLS quanto via função helper org_has_prospection_access.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- TIPOS ENUM
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE prospection_channel AS ENUM ('whatsapp', 'email', 'call');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE prospection_execution_mode AS ENUM ('automated', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE prospection_assignee_mode AS ENUM ('specific_user', 'team_round_robin', 'role_based');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE prospection_enrollment_status AS ENUM ('active', 'paused', 'completed', 'exited');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE prospection_task_status AS ENUM ('pending', 'in_progress', 'done', 'skipped', 'overdue', 'queued');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE prospection_call_outcome AS ENUM (
    'answered_positive',
    'answered_neutral',
    'answered_rejected',
    'voicemail',
    'no_answer',
    'busy',
    'wrong_number'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE prospection_trigger_event AS ENUM (
    'lead_created',
    'stage_changed',
    'stale_in_stage',
    'tag_added',
    'manual'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER: gate de acesso por niche
-- Central pra RLS de todas as tabelas do módulo. Se no futuro liberarmos pra
-- outros nichos, basta editar esta função (ou trocar a constante).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION org_has_prospection_access(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM orgs
    WHERE id = p_org_id
      AND niche = 'ai_agency'
  );
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- users.daily_task_capacity (limite diário de tasks por user)
-- 0 = opt-out (user não recebe tasks de prospecção). Útil pra admin que não
-- atua como BDR mas precisa rodar o motor.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS daily_task_capacity int NOT NULL DEFAULT 50;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_daily_task_capacity_check;
ALTER TABLE users ADD CONSTRAINT users_daily_task_capacity_check
  CHECK (daily_task_capacity >= 0 AND daily_task_capacity <= 500);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABELA 1: prospection_sequences
-- Template da cadência. Cada org tem seus próprios.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS prospection_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,

  -- Comportamento
  exit_on_reply boolean NOT NULL DEFAULT true,
  pause_weekends boolean NOT NULL DEFAULT false,

  -- Horário
  timezone_mode text NOT NULL DEFAULT 'org' CHECK (timezone_mode IN ('org', 'lead_tz')),
  business_hours_start time DEFAULT '09:00:00',
  business_hours_end time DEFAULT '19:00:00',

  -- Auditoria
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prospection_sequences_org ON prospection_sequences(org_id);
CREATE INDEX IF NOT EXISTS idx_prospection_sequences_active ON prospection_sequences(org_id, is_active) WHERE is_active = true;


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABELA 2: prospection_steps
-- Cada etapa de uma sequence.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS prospection_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES prospection_sequences(id) ON DELETE CASCADE,

  position int NOT NULL,
  day_offset int NOT NULL CHECK (day_offset >= 0),

  channel prospection_channel NOT NULL,

  -- Execução
  execution_mode prospection_execution_mode NOT NULL DEFAULT 'manual',
  agent_slug text,  -- quando automated. Ex: 'bdr_email', 'sdr'

  -- Atribuição
  assignee_mode prospection_assignee_mode NOT NULL DEFAULT 'team_round_robin',
  assignee_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  assignee_role text,  -- referência solta para org_roles.slug

  -- Canal físico (quando WhatsApp, qual chip usar)
  whatsapp_instance_id uuid,  -- FK solta para whatsapp_instances

  -- Conteúdo
  title text,  -- rótulo amigável ("Saudação", "Gancho de curiosidade")
  instruction text,  -- nota pro humano executar
  message_templates jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Formato: [{"variant": "A", "label": "direta", "body": "Hola..."}]

  -- Política de desfechos (só pra calls, JSON configurável)
  outcomes_policy jsonb,
  -- Formato: {"answered_positive":"advance","voicemail":"retry_in_4h",...}

  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (sequence_id, position),

  -- Validações
  CHECK (
    (execution_mode = 'automated' AND agent_slug IS NOT NULL)
    OR (execution_mode = 'manual' AND agent_slug IS NULL)
  ),
  CHECK (
    (assignee_mode = 'specific_user' AND assignee_user_id IS NOT NULL)
    OR (assignee_mode = 'role_based' AND assignee_role IS NOT NULL)
    OR (assignee_mode = 'team_round_robin')
  )
);

CREATE INDEX IF NOT EXISTS idx_prospection_steps_sequence ON prospection_steps(sequence_id, position);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABELA 3: prospection_enrollment_rules
-- Regras que inscrevem leads automaticamente em sequences com base em eventos.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS prospection_enrollment_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  sequence_id uuid NOT NULL REFERENCES prospection_sequences(id) ON DELETE CASCADE,

  name text NOT NULL,
  description text,

  priority int NOT NULL DEFAULT 100,

  trigger_event prospection_trigger_event NOT NULL,

  -- Condições pra filtrar leads (JSON flexível)
  -- Exemplos:
  --   {"source": "prospeccao_manual"}
  --   {"source": "site_form", "interesse": "compra"}
  --   {"stage": "new", "stale_days": 7}  ← usado com trigger stale_in_stage
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,

  is_active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prospection_rules_org_active ON prospection_enrollment_rules(org_id, is_active, priority) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_prospection_rules_event ON prospection_enrollment_rules(trigger_event, is_active) WHERE is_active = true;


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABELA 4: prospection_enrollments
-- Lead inscrito numa sequence. Um lead ativo só pode estar em 1 sequence.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS prospection_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  sequence_id uuid NOT NULL REFERENCES prospection_sequences(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  current_step_position int NOT NULL DEFAULT 1,
  status prospection_enrollment_status NOT NULL DEFAULT 'active',

  -- Motivo quando status = exited ou paused
  exit_reason text,

  -- Inscrição / próxima ação / conclusão
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  next_action_at timestamptz,
  paused_at timestamptz,
  completed_at timestamptz,

  -- Origem (rule que inscreveu)
  enrolled_by_rule_id uuid REFERENCES prospection_enrollment_rules(id) ON DELETE SET NULL,
  enrolled_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Um lead só pode estar em 1 sequence ativa por vez
CREATE UNIQUE INDEX IF NOT EXISTS ux_prospection_enrollments_lead_active
  ON prospection_enrollments(lead_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_prospection_enrollments_org_status ON prospection_enrollments(org_id, status);
CREATE INDEX IF NOT EXISTS idx_prospection_enrollments_next_action ON prospection_enrollments(next_action_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_prospection_enrollments_sequence ON prospection_enrollments(sequence_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABELA 5: prospection_tasks
-- A ação acionável do dia (o que aparece na fila do BDR).
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS prospection_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES prospection_enrollments(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES prospection_steps(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  assignee_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  due_at timestamptz NOT NULL,

  status prospection_task_status NOT NULL DEFAULT 'pending',

  -- Desfecho (só relevante pra tasks de call)
  outcome prospection_call_outcome,

  -- Task gerada por retry de outcome anterior
  retry_of_task_id uuid REFERENCES prospection_tasks(id) ON DELETE SET NULL,

  notes text,
  completed_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prospection_tasks_assignee_due ON prospection_tasks(assignee_user_id, due_at) WHERE status IN ('pending', 'in_progress', 'overdue', 'queued');
CREATE INDEX IF NOT EXISTS idx_prospection_tasks_org_status ON prospection_tasks(org_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_prospection_tasks_enrollment ON prospection_tasks(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_prospection_tasks_lead ON prospection_tasks(lead_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABELA 6: prospection_step_executions
-- Log de execuções (base pros analytics).
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS prospection_step_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES prospection_enrollments(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES prospection_steps(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  executed_at timestamptz NOT NULL DEFAULT now(),
  result text NOT NULL,  -- 'success', 'failed', 'reply_detected', 'skipped'
  outcome prospection_call_outcome,

  executed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  variant_used text,  -- qual variação da mensagem foi usada (A, B, C...)

  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_prospection_executions_step ON prospection_step_executions(step_id, executed_at);
CREATE INDEX IF NOT EXISTS idx_prospection_executions_enrollment ON prospection_step_executions(enrollment_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE prospection_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospection_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospection_enrollment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospection_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospection_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospection_step_executions ENABLE ROW LEVEL SECURITY;

-- Policy genérica: mesma org + niche ai_agency (ou staff global)
-- Aplicada em todas as tabelas do módulo.

-- prospection_sequences
DROP POLICY IF EXISTS prospection_sequences_access ON prospection_sequences;
CREATE POLICY prospection_sequences_access ON prospection_sequences
  FOR ALL
  USING (
    (
      org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
      AND org_has_prospection_access(org_id)
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'staff'
  );

-- prospection_steps (via sequence)
DROP POLICY IF EXISTS prospection_steps_access ON prospection_steps;
CREATE POLICY prospection_steps_access ON prospection_steps
  FOR ALL
  USING (
    sequence_id IN (
      SELECT id FROM prospection_sequences
      WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
        AND org_has_prospection_access(org_id)
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'staff'
  );

-- prospection_enrollment_rules
DROP POLICY IF EXISTS prospection_rules_access ON prospection_enrollment_rules;
CREATE POLICY prospection_rules_access ON prospection_enrollment_rules
  FOR ALL
  USING (
    (
      org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
      AND org_has_prospection_access(org_id)
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'staff'
  );

-- prospection_enrollments
DROP POLICY IF EXISTS prospection_enrollments_access ON prospection_enrollments;
CREATE POLICY prospection_enrollments_access ON prospection_enrollments
  FOR ALL
  USING (
    (
      org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
      AND org_has_prospection_access(org_id)
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'staff'
  );

-- prospection_tasks
DROP POLICY IF EXISTS prospection_tasks_access ON prospection_tasks;
CREATE POLICY prospection_tasks_access ON prospection_tasks
  FOR ALL
  USING (
    (
      org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
      AND org_has_prospection_access(org_id)
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'staff'
  );

-- prospection_step_executions
DROP POLICY IF EXISTS prospection_executions_access ON prospection_step_executions;
CREATE POLICY prospection_executions_access ON prospection_step_executions
  FOR ALL
  USING (
    (
      org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
      AND org_has_prospection_access(org_id)
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'staff'
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIGGERS: updated_at automático
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION touch_prospection_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prospection_sequences_updated ON prospection_sequences;
CREATE TRIGGER trg_prospection_sequences_updated
  BEFORE UPDATE ON prospection_sequences
  FOR EACH ROW EXECUTE FUNCTION touch_prospection_updated_at();

DROP TRIGGER IF EXISTS trg_prospection_rules_updated ON prospection_enrollment_rules;
CREATE TRIGGER trg_prospection_rules_updated
  BEFORE UPDATE ON prospection_enrollment_rules
  FOR EACH ROW EXECUTE FUNCTION touch_prospection_updated_at();

DROP TRIGGER IF EXISTS trg_prospection_enrollments_updated ON prospection_enrollments;
CREATE TRIGGER trg_prospection_enrollments_updated
  BEFORE UPDATE ON prospection_enrollments
  FOR EACH ROW EXECUTE FUNCTION touch_prospection_updated_at();

DROP TRIGGER IF EXISTS trg_prospection_tasks_updated ON prospection_tasks;
CREATE TRIGGER trg_prospection_tasks_updated
  BEFORE UPDATE ON prospection_tasks
  FOR EACH ROW EXECUTE FUNCTION touch_prospection_updated_at();


-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED FUNCTION: cria a sequence default "Prospecção Cold 5 Dias"
-- Usada tanto pra orgs existentes quanto para novas (via trigger abaixo).
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION seed_prospection_default_sequence(p_org_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_sequence_id uuid;
BEGIN
  -- Só cria se ainda não existir uma sequence default pra essa org
  IF EXISTS (
    SELECT 1 FROM prospection_sequences
    WHERE org_id = p_org_id AND name = 'Prospecção Cold 5 Dias'
  ) THEN
    RETURN NULL;
  END IF;

  -- Sequence
  INSERT INTO prospection_sequences (
    org_id, name, description, is_active, exit_on_reply, pause_weekends,
    timezone_mode, business_hours_start, business_hours_end
  )
  VALUES (
    p_org_id,
    'Prospecção Cold 5 Dias',
    'Cadência padrão de 4 canais: WhatsApp + Email + Ligação com ICUVA + Último toque. 5 dias totais com respiro de 2 dias antes do encerramento.',
    true, true, false,
    'org', '09:00:00', '19:00:00'
  )
  RETURNING id INTO v_sequence_id;

  -- ─── STEP 1: WhatsApp Saudação (Dia 1) ───
  INSERT INTO prospection_steps (
    sequence_id, position, day_offset, channel, execution_mode,
    assignee_mode, title, instruction, message_templates
  ) VALUES (
    v_sequence_id, 1, 1, 'whatsapp', 'manual', 'team_round_robin',
    'Saudação',
    'Dispara sozinha. Se houver auto-resposta do lead, a Etapa 2 entra 5-15s depois. Se não houver, esperar 2-5 min e disparar a Etapa 2 igual.',
    jsonb_build_array(
      jsonb_build_object('variant', 'A', 'label', 'formal-neutra',
        'body', 'Hola {{nombre}}, buenas {{tardes}}. Soy Leonardo.'),
      jsonb_build_object('variant', 'B', 'label', 'mais pessoal',
        'body', 'Hola {{nombre}}, cómo está? Le habla Leonardo.'),
      jsonb_build_object('variant', 'C', 'label', 'estilo escritório',
        'body', 'Buenas {{tardes}} {{nombre}}, soy Leonardo.')
    )
  );

  -- ─── STEP 2: WhatsApp Gancho de Curiosidade (Dia 1) ───
  INSERT INTO prospection_steps (
    sequence_id, position, day_offset, channel, execution_mode,
    assignee_mode, title, instruction, message_templates
  ) VALUES (
    v_sequence_id, 2, 1, 'whatsapp', 'manual', 'team_round_robin',
    'Gancho de curiosidade',
    'Não revela Oryen. Alterna Instagram / Site conforme a origem real do lead. Dispara 5-15s após auto-resposta OU 2-5 min após Etapa 1.',
    jsonb_build_array(
      jsonb_build_object('variant', 'IG-A', 'label', 'Instagram direta',
        'body', 'Entré a su perfil de Instagram y quería comentarle algo.'),
      jsonb_build_object('variant', 'IG-B', 'label', 'Instagram com dúvida',
        'body', 'Llegué hasta aquí a través de su Instagram y me quedé con una duda.'),
      jsonb_build_object('variant', 'IG-C', 'label', 'Instagram chamou atenção',
        'body', 'Vi su perfil en Instagram y me llamó la atención.'),
      jsonb_build_object('variant', 'SITE-A', 'label', 'Site direta',
        'body', 'Llegué a su contacto por su sitio web y quería comentarle algo.'),
      jsonb_build_object('variant', 'SITE-B', 'label', 'Site com dúvida',
        'body', 'Vi su sitio y me quedé con una duda.'),
      jsonb_build_object('variant', 'SITE-C', 'label', 'Site comentar algo',
        'body', 'Le escribo porque vi su sitio web y quería hacerle un comentario.')
    )
  );

  -- ─── STEP 3: Email automático (Dia 2) ───
  INSERT INTO prospection_steps (
    sequence_id, position, day_offset, channel, execution_mode, agent_slug,
    assignee_mode, title, instruction, message_templates
  ) VALUES (
    v_sequence_id, 3, 2, 'email', 'automated', 'bdr_email',
    'team_round_robin',
    'Email de continuidade',
    'Agente BDR Email dispara automaticamente. Não requer ação manual. O conteúdo base é referência pra Teresita citar na ligação do Dia 3.',
    jsonb_build_array(
      jsonb_build_object('variant', 'A', 'label', 'assunto A',
        'subject', '{{nombre}}, continuación de nuestro WhatsApp',
        'body', 'Hola {{nombre}}, cómo está.

Le escribí hace unos días por WhatsApp sobre una herramienta que armamos para asesores inmobiliarios. Paso por aquí para darle un poco más de contexto por este canal.

En Oryen tenemos una IA que atiende el WhatsApp del asesor las 24 horas, responde a los leads, los califica y agenda las visitas automáticamente. El objetivo es simple, que ningún lead se pierda por demora en la respuesta.

La mayoría de los asesores con los que trabajamos pierde entre un 30% y un 40% de los contactos solo por no responder a tiempo. Es exactamente eso lo que resolvemos.

Si le hace sentido, podemos coordinar una reunión corta por videollamada donde le muestro el sistema aplicado a su operación.

Puede responder este email o escribirme al WhatsApp por el mismo número que usé antes.

Un saludo,
Leonardo
Equipo Oryen')
    )
  );

  -- ─── STEP 4: Ligação com ICUVA (Dia 3) ───
  INSERT INTO prospection_steps (
    sequence_id, position, day_offset, channel, execution_mode,
    assignee_mode, title, instruction, outcomes_policy, message_templates
  ) VALUES (
    v_sequence_id, 4, 3, 'call', 'manual', 'team_round_robin',
    'Ligação com ICUVA',
    'Ligação direta usando o WhatsApp + email como pretexto. Aplicar ICUVA (Interesse, Confiança, Urgência, Valor, Autoridade). Ao final, agendar a reunião de demo.',
    jsonb_build_object(
      'answered_positive', 'advance',
      'answered_neutral',  'retry_in_24h',
      'answered_rejected', 'exit:not_interested',
      'voicemail',         'retry_in_4h',
      'no_answer',         'retry_in_4h',
      'busy',              'retry_in_2h',
      'wrong_number',      'exit:bad_data'
    ),
    jsonb_build_array(
      jsonb_build_object('variant', 'APERTURA', 'label', 'abertura da ligação',
        'body', 'Hola, buenas tardes. Hablo con {{nombre}}?

Soy {{seu nome}}, del equipo de Oryen. Le escribimos hace un par de días por WhatsApp y ayer le enviamos un email. Aproveché este momento para llamarlo directamente y aclarar cualquier duda. Tiene 2 minutos ahora?'),
      jsonb_build_object('variant', 'I-INTERES', 'label', 'Interesse (diagnóstico)',
        'body', 'Gracias por el tiempo. Voy directo al punto.

Los leads que le llegan por Instagram, sitio web o WhatsApp, cómo los maneja hoy? Especialmente los que entran fuera del horario, de noche, fin de semana o mientras está atendiendo a otro cliente.'),
      jsonb_build_object('variant', 'V-VALOR', 'label', 'Valor (dimensionar)',
        'body', 'Le entiendo. El tema es que el mercado cambió. El primer asesor que responde al lead casi siempre se queda con la venta, y en promedio los asesores pierden entre un 30% y un 40% de los contactos solo por demora.

Cuántos leads por semana aproximadamente le entran sumando todos los canales?'),
      jsonb_build_object('variant', 'U-URGENCIA', 'label', 'Urgência',
        'body', 'Y hace cuánto viene con esa situación? Es algo que le preocupa ahora, o que puede esperar unos meses?'),
      jsonb_build_object('variant', 'C-CONFIANZA', 'label', 'Confiança (prova)',
        'body', 'Nosotros en Oryen armamos una IA que atiende su WhatsApp las 24 horas, responde a cada lead, lo califica y le agenda la visita en su nombre.

Hoy estamos trabajando con asesores en Brasil, Uruguay y Argentina. Los resultados típicos son de 2 a 3 veces más visitas agendadas, sin tener que contratar ningún SDR humano.'),
      jsonb_build_object('variant', 'A-AUTORIDAD', 'label', 'Autoridade',
        'body', 'Para decidir invertir en este tipo de herramienta en su operación, la decisión pasa solo por usted o hay alguien más involucrado?'),
      jsonb_build_object('variant', 'CIERRE', 'label', 'fechamento',
        'body', 'Perfecto.

Lo que le propongo es una reunión por videollamada donde le muestro el sistema por dentro, aplicado a su operación, con escenarios reales. Le queda mejor mañana por la mañana o por la tarde?')
    )
  );

  -- ─── STEP 5: WhatsApp Último Toque (Dia 5) ───
  INSERT INTO prospection_steps (
    sequence_id, position, day_offset, channel, execution_mode,
    assignee_mode, title, instruction, message_templates
  ) VALUES (
    v_sequence_id, 5, 5, 'whatsapp', 'manual', 'team_round_robin',
    'Último toque de encerramento',
    'Depois de 2 dias de respiro. Postura firme, sem insistir. Porta aberta sem forçar.',
    jsonb_build_array(
      jsonb_build_object('variant', 'A', 'label', 'completa',
        'body', 'Hola {{nombre}}.

Intenté contacto en los últimos días porque creo que lo que hacemos en Oryen podría impactar directamente en sus resultados de ventas. Además de la IA que atiende WhatsApp las 24 horas, tenemos CRM, portafolio de inmuebles, sitio web profesional y documentos inteligentes — todo pensado para estructurar la parte comercial del asesor en un único lugar.

Respeto si no es el momento. Le dejo el canal abierto para cuando tenga sentido.

Un abrazo.'),
      jsonb_build_object('variant', 'B', 'label', 'breve',
        'body', 'Hola {{nombre}}.

Intenté contacto porque creo que podemos impactar directamente en sus resultados de ventas. Oryen no es solo IA de WhatsApp — es un ecosistema que estructura la parte comercial del asesor con CRM, portafolio, sitio web y documentos inteligentes.

Respeto si no es prioridad ahora. El canal queda abierto.

Un abrazo.')
    )
  );

  -- ─── REGRA DE INSCRIÇÃO DEFAULT: lead criado com source = 'prospeccao_manual' ───
  INSERT INTO prospection_enrollment_rules (
    org_id, sequence_id, name, description, priority,
    trigger_event, conditions, is_active
  ) VALUES (
    p_org_id, v_sequence_id,
    'Prospecção manual',
    'Inscreve leads criados manualmente (origem prospeccao_manual) na sequence padrão.',
    10,
    'lead_created',
    jsonb_build_object('source', 'prospeccao_manual'),
    true
  );

  RETURN v_sequence_id;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SEEDER: cria sequence default para todas as orgs ai_agency existentes
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_org RECORD;
BEGIN
  FOR v_org IN SELECT id FROM orgs WHERE niche = 'ai_agency' LOOP
    PERFORM seed_prospection_default_sequence(v_org.id);
  END LOOP;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIGGER: quando uma org ai_agency é criada (ou muda de niche pra ai_agency),
-- cria a sequence default automaticamente.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION on_org_niche_change_seed_prospection()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.niche = 'ai_agency' AND (TG_OP = 'INSERT' OR OLD.niche IS DISTINCT FROM NEW.niche) THEN
    PERFORM seed_prospection_default_sequence(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_seed_prospection_on_org ON orgs;
CREATE TRIGGER trg_seed_prospection_on_org
  AFTER INSERT OR UPDATE OF niche ON orgs
  FOR EACH ROW
  EXECUTE FUNCTION on_org_niche_change_seed_prospection();


-- ═══════════════════════════════════════════════════════════════════════════════
-- COMMENTS (documentação inline)
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE prospection_sequences IS 'Template de cadência de prospecção. Cada org ai_agency tem seus próprios. Uma sequence é formada por múltiplos steps ordenados.';
COMMENT ON TABLE prospection_steps IS 'Etapas de uma sequence. Cada step define canal, dia, modo de execução (IA ou humano) e dono.';
COMMENT ON TABLE prospection_enrollment_rules IS 'Regras que inscrevem leads automaticamente em sequences com base em eventos (lead criado, estágio alterado, etc).';
COMMENT ON TABLE prospection_enrollments IS 'O lead dentro de uma sequence. Um lead só pode estar em 1 sequence ativa por vez (garantido por unique index parcial).';
COMMENT ON TABLE prospection_tasks IS 'Ação acionável gerada dos steps manuais. Aparece na fila "Meu Dia" do BDR.';
COMMENT ON TABLE prospection_step_executions IS 'Log histórico de execuções. Usado pelos analytics (taxa de conversão por step, etc).';

COMMENT ON FUNCTION org_has_prospection_access IS 'Gate central do módulo. Retorna true só se a org for do nicho ai_agency. Central pra RLS.';
COMMENT ON FUNCTION seed_prospection_default_sequence IS 'Cria a sequence padrão "Prospecção Cold 5 Dias" com 5 steps e 1 regra de inscrição para a org indicada.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- FIM DA MIGRATION
-- Próximos passos:
--   1. lib/prospection/engine.ts — motor que roda a cada hora
--   2. API routes CRUD de sequences, steps, rules, enrollments, tasks
--   3. Tela /dashboard/prospection/my-day — fila do BDR
--   4. Editor de sequence /dashboard/prospection/sequences/[id]
--   5. Analytics /dashboard/prospection/analytics
--   6. Gate no Sidebar (NICHES_WITH_PROSPECTION = ['ai_agency'])
-- ═══════════════════════════════════════════════════════════════════════════════
