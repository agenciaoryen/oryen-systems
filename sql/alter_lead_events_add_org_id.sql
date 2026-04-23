-- Adiciona org_id direto em lead_events (com trigger que preenche a partir do lead_id).
--
-- Motivação: querying events filtrando por .in('lead_id', [muitos ids]) estoura
-- o limite de URL do PostgREST quando a org tem 1000+ leads. Com org_id direto
-- aqui, basta .eq('org_id', orgId) — bem mais performante e sem esse limite.
--
-- Mantém compatibilidade: rows antigas ficam com org_id populado via backfill.
-- Novos INSERTs: trigger pega o org_id do lead automaticamente.

-- 1. Adiciona a coluna
ALTER TABLE lead_events
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id) ON DELETE CASCADE;

-- 2. Backfill das linhas existentes
UPDATE lead_events le
SET org_id = l.org_id
FROM leads l
WHERE le.lead_id = l.id AND le.org_id IS NULL;

-- 3. Trigger pra auto-popular em INSERTs futuros
CREATE OR REPLACE FUNCTION lead_events_set_org_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.org_id IS NULL AND NEW.lead_id IS NOT NULL THEN
    SELECT org_id INTO NEW.org_id FROM leads WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lead_events_set_org_id ON lead_events;
CREATE TRIGGER trg_lead_events_set_org_id
  BEFORE INSERT ON lead_events
  FOR EACH ROW
  EXECUTE FUNCTION lead_events_set_org_id();

-- 4. Índice composto pra query de relatórios
CREATE INDEX IF NOT EXISTS idx_lead_events_org_type_created
  ON lead_events(org_id, type, created_at DESC);
