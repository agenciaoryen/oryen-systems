// Gerencia o cursor de cobertura sistemática:
//   tabela hunter_search_cursor (campaign_id, city, segment, search_strategy)
//
// A cada execução, em vez de sortear cidade × segmento, pegamos a combinação
// que tem last_run_at mais antigo (NULLS FIRST = nunca rodada).
// Garante que todas as combinações são percorridas — sem aleatoriedade.
//
// Quando todas estão "frescas" (rodadas hoje), o picker volta pra mais antiga
// e começa o próximo ciclo.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface CursorRow {
  id: string
  campaign_id: string
  city: string
  segment: string
  search_strategy: 'general' | 'instagram' | 'google_maps'
  last_run_at: string | null
  total_runs: number
  leads_found: number
  leads_saved: number
  leads_duplicated: number
  last_error: string | null
}

/**
 * Garante que existe um cursor pra cada combinação (city × segment) da campanha.
 * Idempotente — chama na primeira execução e quando o config muda.
 */
export async function ensureCursors(
  campaignId: string,
  config: {
    locations?: string[] | null
    business_type?: string | string[] | null
    search_strategy?: 'general' | 'instagram' | 'google_maps' | null
  }
): Promise<void> {
  const cities = (config.locations || []).map((s) => String(s).trim()).filter(Boolean)

  // business_type pode ser string CSV (legado) ou array (novo schema)
  let segments: string[] = []
  if (Array.isArray(config.business_type)) {
    segments = config.business_type.map((s) => String(s).trim()).filter(Boolean)
  } else if (typeof config.business_type === 'string') {
    segments = config.business_type
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }

  const strategy = config.search_strategy || 'google_maps'

  if (cities.length === 0 || segments.length === 0) return

  // Monta todas as combinações
  const rows: { campaign_id: string; city: string; segment: string; search_strategy: string }[] = []
  for (const city of cities) {
    for (const segment of segments) {
      rows.push({
        campaign_id: campaignId,
        city,
        segment,
        search_strategy: strategy,
      })
    }
  }

  // Insert com onConflict — combinações já existentes ficam intactas
  const { error } = await supabase.from('hunter_search_cursor').upsert(rows, {
    onConflict: 'campaign_id,city,segment,search_strategy',
    ignoreDuplicates: true,
  })

  if (error) {
    console.error('[hunter cursor] erro ao criar cursores:', error)
  }
}

/**
 * Pega a próxima combinação a rodar — a com last_run_at mais antigo.
 * NULLS FIRST garante que combinações nunca rodadas têm prioridade.
 */
export async function pickNextCursor(campaignId: string): Promise<CursorRow | null> {
  const { data, error } = await supabase
    .from('hunter_search_cursor')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('last_run_at', { ascending: true, nullsFirst: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[hunter cursor] erro ao pegar próximo cursor:', error)
    return null
  }

  return data as CursorRow | null
}

/**
 * Atualiza o cursor após uma execução.
 */
export async function recordCursorRun(
  cursorId: string,
  result: {
    leads_found: number
    leads_saved: number
    leads_duplicated: number
    error?: string | null
  }
): Promise<void> {
  // Lê valores atuais pra incrementar
  const { data: current } = await supabase
    .from('hunter_search_cursor')
    .select('total_runs, leads_found, leads_saved, leads_duplicated')
    .eq('id', cursorId)
    .single()

  const { error } = await supabase
    .from('hunter_search_cursor')
    .update({
      last_run_at: new Date().toISOString(),
      total_runs: (current?.total_runs || 0) + 1,
      leads_found: (current?.leads_found || 0) + result.leads_found,
      leads_saved: (current?.leads_saved || 0) + result.leads_saved,
      leads_duplicated: (current?.leads_duplicated || 0) + result.leads_duplicated,
      last_error: result.error || null,
    })
    .eq('id', cursorId)

  if (error) {
    console.error('[hunter cursor] erro ao atualizar cursor:', error)
  }
}
