-- ═══════════════════════════════════════════════════════════════════════════════
-- TRACK STAGE CHANGE NO LEAD
-- ═══════════════════════════════════════════════════════════════════════════════
-- leads.last_stage_change_at existe na tabela desde v2.2 mas nunca foi
-- alimentado — o Analytics IA usa esse campo pra calcular "dias parado no
-- estágio", então funil de conversão mostrava números incorretos.
--
-- Este trigger atualiza o timestamp automaticamente sempre que o stage muda,
-- independente de qual API fez a mudança (CRM, kanban, pill de prospecção,
-- complete task, etc).
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_lead_last_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    NEW.last_stage_change_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_track_stage_change ON leads;
CREATE TRIGGER trg_leads_track_stage_change
  BEFORE UPDATE OF stage ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_last_stage_change();


-- ─── Backfill: popula last_stage_change_at de leads existentes ───
-- Pega o stage_changed event mais recente de lead_events; fallback pra updated_at.
UPDATE leads l
SET last_stage_change_at = sub.changed_at
FROM (
  SELECT DISTINCT ON (lead_id)
    lead_id,
    created_at AS changed_at
  FROM lead_events
  WHERE type = 'stage_changed'
  ORDER BY lead_id, created_at DESC
) sub
WHERE l.id = sub.lead_id
  AND l.last_stage_change_at IS NULL;

-- Fallback: quem não tem evento registrado herda updated_at
UPDATE leads
SET last_stage_change_at = updated_at
WHERE last_stage_change_at IS NULL;


COMMENT ON FUNCTION update_lead_last_stage_change IS
  'Atualiza leads.last_stage_change_at sempre que o stage muda. Crítico pro Analytics IA calcular permanência em estágio corretamente.';
