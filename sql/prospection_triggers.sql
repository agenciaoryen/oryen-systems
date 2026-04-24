-- ═══════════════════════════════════════════════════════════════════════════════
-- PROSPECÇÃO · INSCRIPTION TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════
-- Inscreve leads automaticamente em sequences quando eventos acontecem:
--   • lead_created → dispara ao inserir um lead
--   • stage_changed → dispara quando leads.stage é atualizado
--
-- A função prospection_try_enroll_lead avalia as rules ativas da org do lead,
-- ordenadas por priority, e inscreve na primeira cuja `conditions` bate.
--
-- Conditions matching (exemplos suportados em jsonb):
--   {"source": "prospeccao_manual"}              → lead.source = 'prospeccao_manual'
--   {"source_in": ["site_form", "indicacao"]}    → lead.source IN (...)
--   {"stage": "new"}                             → lead.stage = 'new'
--   {"stage_in": ["new", "qualifying"]}          → lead.stage IN (...)
--   {"interesse": "compra"}                      → lead.interesse = 'compra'
--   {}                                           → sempre bate (catch-all)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION prospection_condition_matches(
  p_conditions jsonb,
  p_lead leads
) RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_key text;
  v_val jsonb;
BEGIN
  -- Sem condições = sempre bate
  IF p_conditions IS NULL OR p_conditions = '{}'::jsonb THEN
    RETURN true;
  END IF;

  FOR v_key, v_val IN SELECT * FROM jsonb_each(p_conditions) LOOP
    -- source
    IF v_key = 'source' THEN
      IF p_lead.source IS DISTINCT FROM v_val #>> '{}' THEN RETURN false; END IF;

    ELSIF v_key = 'source_in' THEN
      IF NOT (p_lead.source = ANY(SELECT jsonb_array_elements_text(v_val))) THEN
        RETURN false;
      END IF;

    -- stage
    ELSIF v_key = 'stage' THEN
      IF p_lead.stage IS DISTINCT FROM v_val #>> '{}' THEN RETURN false; END IF;

    ELSIF v_key = 'stage_in' THEN
      IF NOT (p_lead.stage = ANY(SELECT jsonb_array_elements_text(v_val))) THEN
        RETURN false;
      END IF;

    -- interesse (compra / locacao / ambos)
    ELSIF v_key = 'interesse' THEN
      IF p_lead.interesse IS DISTINCT FROM v_val #>> '{}' THEN RETURN false; END IF;

    -- tipo_contato (comprador / locatario)
    ELSIF v_key = 'tipo_contato' THEN
      IF p_lead.tipo_contato IS DISTINCT FROM v_val #>> '{}' THEN RETURN false; END IF;

    -- city
    ELSIF v_key = 'city' THEN
      IF p_lead.city IS DISTINCT FROM v_val #>> '{}' THEN RETURN false; END IF;

    -- stale_days: só usado com trigger stale_in_stage (processado no motor, ignorado aqui)
    ELSIF v_key = 'stale_days' THEN
      CONTINUE;

    -- Chave desconhecida — por segurança, rejeita
    ELSE
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION prospection_condition_matches IS 'Avalia se um lead bate com um conjunto de condições jsonb de uma rule.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- Função principal: tenta inscrever um lead em sequence pelo evento
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION prospection_try_enroll_lead(
  p_lead_id uuid,
  p_event prospection_trigger_event
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_lead leads;
  v_rule RECORD;
  v_first_step RECORD;
  v_next_action timestamptz;
  v_enrollment_id uuid;
BEGIN
  -- Busca o lead inteiro
  SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Gate: só orgs ai_agency
  IF NOT org_has_prospection_access(v_lead.org_id) THEN
    RETURN NULL;
  END IF;

  -- Já tem enrollment ativo? Skip (1 lead = 1 sequence ativa)
  IF EXISTS (
    SELECT 1 FROM prospection_enrollments
    WHERE lead_id = p_lead_id AND status = 'active'
  ) THEN
    RETURN NULL;
  END IF;

  -- Busca rules ativas para o evento, por priority
  FOR v_rule IN
    SELECT r.*
    FROM prospection_enrollment_rules r
    WHERE r.org_id = v_lead.org_id
      AND r.is_active = true
      AND r.trigger_event = p_event
    ORDER BY r.priority ASC, r.created_at ASC
  LOOP
    -- Condições batem?
    IF NOT prospection_condition_matches(v_rule.conditions, v_lead) THEN
      CONTINUE;
    END IF;

    -- Busca primeiro step da sequence
    SELECT id, day_offset INTO v_first_step
    FROM prospection_steps
    WHERE sequence_id = v_rule.sequence_id AND position = 1;

    IF NOT FOUND THEN
      -- Sequence sem step 1 não pode inscrever
      CONTINUE;
    END IF;

    -- next_action_at = agora + day_offset do step 1 (dia 1 = agora, dia 2 = +1d...)
    v_next_action := now() + make_interval(days => GREATEST(v_first_step.day_offset - 1, 0));

    -- Cria enrollment
    INSERT INTO prospection_enrollments (
      org_id, sequence_id, lead_id, current_step_position, status,
      next_action_at, enrolled_by_rule_id
    ) VALUES (
      v_lead.org_id, v_rule.sequence_id, p_lead_id, 1, 'active',
      v_next_action, v_rule.id
    )
    RETURNING id INTO v_enrollment_id;

    -- Primeira rule que bateu ganha, sai do loop
    RETURN v_enrollment_id;
  END LOOP;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION prospection_try_enroll_lead IS 'Inscreve o lead na primeira sequence cuja rule (do evento informado) bate com as condições. Retorna o enrollment_id ou NULL.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIGGER: leads INSERT → dispara 'lead_created'
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION trg_lead_created_enroll()
RETURNS TRIGGER AS $$
BEGIN
  -- Não bloqueia o insert se der erro, só loga
  BEGIN
    PERFORM prospection_try_enroll_lead(NEW.id, 'lead_created');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'prospection_try_enroll_lead failed for lead %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prospection_on_lead_insert ON leads;
CREATE TRIGGER trg_prospection_on_lead_insert
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trg_lead_created_enroll();


-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIGGER: leads UPDATE stage → dispara 'stage_changed'
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION trg_lead_stage_changed_enroll()
RETURNS TRIGGER AS $$
BEGIN
  -- Só dispara se o stage realmente mudou
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    BEGIN
      PERFORM prospection_try_enroll_lead(NEW.id, 'stage_changed');
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'prospection_try_enroll_lead failed for lead %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prospection_on_lead_stage_update ON leads;
CREATE TRIGGER trg_prospection_on_lead_stage_update
  AFTER UPDATE OF stage ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trg_lead_stage_changed_enroll();


-- ═══════════════════════════════════════════════════════════════════════════════
-- REPLY DETECTION: quando o lead responde pelo WhatsApp, pausa o enrollment.
-- Aqui só criamos a função. O hook no WhatsApp webhook chama essa função.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION prospection_handle_lead_reply(p_lead_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_enrollment RECORD;
  v_sequence RECORD;
BEGIN
  -- Busca enrollment ativo do lead
  SELECT e.*, s.exit_on_reply INTO v_enrollment
  FROM prospection_enrollments e
  JOIN prospection_sequences s ON s.id = e.sequence_id
  WHERE e.lead_id = p_lead_id AND e.status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN RETURN false; END IF;

  -- Se a sequence tem exit_on_reply desligado, não pausa
  IF NOT v_enrollment.exit_on_reply THEN
    RETURN false;
  END IF;

  -- Pausa enrollment
  UPDATE prospection_enrollments
  SET status = 'paused',
      exit_reason = 'replied',
      paused_at = now()
  WHERE id = v_enrollment.id;

  -- Cancela tasks pendentes desse enrollment
  UPDATE prospection_tasks
  SET status = 'skipped',
      notes = COALESCE(notes, '') || ' [auto-skipped: lead replied]'
  WHERE enrollment_id = v_enrollment.id
    AND status IN ('pending', 'in_progress', 'overdue', 'queued');

  RETURN true;
END;
$$;

COMMENT ON FUNCTION prospection_handle_lead_reply IS 'Pausa o enrollment ativo do lead quando ele responde (se exit_on_reply=true). Cancela tasks pendentes. Chamada pelo webhook de WhatsApp/email.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- FIM — INSCRIPTION TRIGGERS + REPLY HANDLER
-- ═══════════════════════════════════════════════════════════════════════════════
