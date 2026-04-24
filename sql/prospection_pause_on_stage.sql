-- ═══════════════════════════════════════════════════════════════════════════════
-- PROSPECÇÃO · PAUSA POR MUDANÇA DE STAGE
-- ═══════════════════════════════════════════════════════════════════════════════
-- Permite que o admin configure por sequence quais stages (ex: "lead_respondeu",
-- "qualificado", "venda_fechada") pausam automaticamente o enrollment quando
-- o stage do lead muda para um deles.
--
-- Útil quando o webhook do WhatsApp não está conectado — o BDR muda o stage
-- manualmente e a cadência pausa sem depender de mensagem inbound.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Coluna na sequence: array de stage slugs que pausam o enrollment
ALTER TABLE prospection_sequences
  ADD COLUMN IF NOT EXISTS pause_on_stages text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN prospection_sequences.pause_on_stages IS
  'Array de pipeline_stages.name (slugs) que, quando atingidos pelo lead, pausam o enrollment ativo. Usado quando o webhook de WhatsApp não está conectado e a detecção de resposta é manual (via mudança de stage).';


-- ─── FUNÇÃO: processa mudança de stage e pausa enrollment se necessário ───
CREATE OR REPLACE FUNCTION prospection_handle_lead_stage_change(
  p_lead_id uuid,
  p_new_stage text
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_enrollment RECORD;
BEGIN
  -- Busca enrollment ativo do lead onde a sequence tem esse stage na lista de pausa
  SELECT e.*
  INTO v_enrollment
  FROM prospection_enrollments e
  JOIN prospection_sequences s ON s.id = e.sequence_id
  WHERE e.lead_id = p_lead_id
    AND e.status = 'active'
    AND p_new_stage = ANY(s.pause_on_stages)
  LIMIT 1;

  IF NOT FOUND THEN RETURN false; END IF;

  -- Pausa enrollment com exit_reason='replied' (mesmo bucket do webhook)
  UPDATE prospection_enrollments
  SET status = 'paused',
      exit_reason = 'replied',
      paused_at = now()
  WHERE id = v_enrollment.id;

  -- Cancela tasks pendentes desse enrollment
  UPDATE prospection_tasks
  SET status = 'skipped',
      notes = COALESCE(notes, '') || ' [auto-skipped: lead stage = ' || p_new_stage || ']'
  WHERE enrollment_id = v_enrollment.id
    AND status IN ('pending', 'in_progress', 'overdue', 'queued');

  RETURN true;
END;
$$;

COMMENT ON FUNCTION prospection_handle_lead_stage_change IS
  'Pausa o enrollment ativo do lead se a sequence tiver o novo stage em pause_on_stages. Chamado pelo trigger de stage update em leads.';


-- ─── TRIGGER: quando leads.stage muda, avalia se deve pausar ───
CREATE OR REPLACE FUNCTION trg_lead_stage_pause_prospection()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage AND NEW.stage IS NOT NULL THEN
    BEGIN
      PERFORM prospection_handle_lead_stage_change(NEW.id, NEW.stage);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'prospection_handle_lead_stage_change failed for lead %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prospection_pause_on_stage ON leads;
CREATE TRIGGER trg_prospection_pause_on_stage
  AFTER UPDATE OF stage ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trg_lead_stage_pause_prospection();


-- ═══════════════════════════════════════════════════════════════════════════════
-- FIM
-- ═══════════════════════════════════════════════════════════════════════════════
