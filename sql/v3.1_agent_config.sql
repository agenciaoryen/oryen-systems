-- ═══════════════════════════════════════════════════════════════════════════════
-- v3.1 — Agent Config (SDR como funcionário, config única)
-- Adiciona coluna config ao agents para agentes single-config (SDR)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE agents ADD COLUMN IF NOT EXISTS config JSONB DEFAULT NULL;

-- Migrar config da primeira campanha ativa de cada agente SDR para agents.config
UPDATE agents a
SET config = c.config
FROM (
  SELECT DISTINCT ON (agent_id) agent_id, config
  FROM agent_campaigns
  WHERE status IN ('active', 'paused')
  ORDER BY agent_id, created_at ASC
) c
WHERE a.id = c.agent_id
  AND a.solution_slug = 'sdr_imobiliario'
  AND a.config IS NULL;
