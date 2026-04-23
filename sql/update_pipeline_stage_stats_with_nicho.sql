-- Atualiza pipeline_stage_stats pra aceitar filtro opcional de nicho.
-- Só usado quando a org é do tipo ai_agency, mas a função aceita o parâmetro
-- de forma genérica (NULL = não filtra, igual aos outros filtros).

CREATE OR REPLACE FUNCTION pipeline_stage_stats(
  p_org_id uuid,
  p_filter_date timestamptz DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_ai_filter text DEFAULT NULL,
  p_assigned text DEFAULT NULL,
  p_tag_ids uuid[] DEFAULT NULL,
  p_nicho text DEFAULT NULL
)
RETURNS TABLE (
  stage_name text,
  lead_count bigint,
  value_sum numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    l.stage::text AS stage_name,
    COUNT(*)::bigint AS lead_count,
    COALESCE(SUM(l.total_em_vendas), 0)::numeric AS value_sum
  FROM leads l
  WHERE l.org_id = p_org_id
    AND (p_filter_date IS NULL
         OR l.created_at >= p_filter_date
         OR l.updated_at >= p_filter_date)
    AND (p_search IS NULL OR p_search = '' OR (
      l.name ILIKE '%' || p_search || '%' OR
      l.nome_empresa ILIKE '%' || p_search || '%' OR
      l.email ILIKE '%' || p_search || '%' OR
      l.phone ILIKE '%' || p_search || '%'
    ))
    AND (p_ai_filter IS NULL
         OR (p_ai_filter = 'active' AND l.conversa_finalizada = false)
         OR (p_ai_filter = 'paused' AND l.conversa_finalizada = true))
    AND (p_assigned IS NULL
         OR (p_assigned = 'unassigned' AND l.assigned_to IS NULL)
         OR (p_assigned <> 'unassigned' AND p_assigned <> 'all' AND l.assigned_to::text = p_assigned))
    AND (p_tag_ids IS NULL OR EXISTS (
      SELECT 1 FROM lead_tags lt
      WHERE lt.lead_id = l.id AND lt.tag_id = ANY(p_tag_ids)
    ))
    AND (p_nicho IS NULL OR p_nicho = '' OR (
      (p_nicho = '__unassigned__' AND l.nicho IS NULL) OR
      (p_nicho <> '__unassigned__' AND l.nicho = p_nicho)
    ))
  GROUP BY l.stage;
$$;
