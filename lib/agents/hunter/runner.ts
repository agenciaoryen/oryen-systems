// Runner do Hunter B2B — substitui o webhook n8n.
// Fluxo:
//   1. ensureCursors(campaign) — popula combinações cidade × segmento
//   2. pickNextCursor — pega a mais "esquecida"
//   3. buildQuery + Serper search
//   4. extractLeads do JSON do Serper (sem IA)
//   5. opcional: scrape do site pra preencher email/phone faltantes
//   6. dedup + insert no leads
//   7. atualiza cursor + agent_runs + agent_campaigns + agent.current_usage

import { createClient } from '@supabase/supabase-js'
import { serper } from '../sources/serper'
import { getCountryConfig } from './country-config'
import { buildQuery } from './query-builder'
import { extractLeads } from './lead-extractor'
import { scrapeContact } from './site-scraper'
import { ensureCursors, pickNextCursor, recordCursorRun } from './cursor'
import { normalizePhone } from './phone-normalizer'
import type { RawLead } from '../sources/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RunnerInput {
  runId: string
  campaign: any
  agent: any
  org: { id: string; country?: string | null; language?: string | null; name?: string | null; niche?: string | null }
  maxLeads: number
}

interface RunnerOutput {
  status: 'success' | 'partial' | 'error' | 'skipped'
  leads_found: number
  leads_saved: number
  leads_duplicated: number
  error_message?: string
  duration_ms: number
}

/**
 * Roda 1 execução da campanha hunter_b2b.
 * Pega 1 combinação (cidade × segmento) e busca até maxLeads no Serper.
 */
export async function runHunterCampaign(input: RunnerInput): Promise<RunnerOutput> {
  const startedAt = Date.now()
  const { runId, campaign, agent, org, maxLeads } = input
  const country = getCountryConfig(org.country)
  const config = campaign.config || {}

  try {
    // 1. Garante cursores criados
    await ensureCursors(campaign.id, config)

    // 2. Pega próxima combinação
    const cursor = await pickNextCursor(campaign.id)
    if (!cursor) {
      return {
        status: 'error',
        leads_found: 0,
        leads_saved: 0,
        leads_duplicated: 0,
        error_message: 'Nenhum cursor disponível — config inválida (locations + business_type vazios?)',
        duration_ms: Date.now() - startedAt,
      }
    }

    console.log(
      `[hunter ${runId.substring(0, 8)}] cursor: ${cursor.city} × ${cursor.segment} (${cursor.search_strategy})`
    )

    // 3. Monta query e bate no Serper
    const built = buildQuery({
      city: cursor.city,
      segment: cursor.segment,
      strategy: cursor.search_strategy,
      country,
      keywords: Array.isArray(config.keywords) ? config.keywords : [],
      excludeKeywords: Array.isArray(config.exclude_keywords) ? config.exclude_keywords : [],
      hasPhone: config.has_phone !== false,
    })

    const serperResp = await serper.search({
      query: built.query,
      strategy: built.strategy,
      hl: country.searchLang,
      gl: (org.country || 'CL').toLowerCase(),
      num: Math.min(maxLeads * 2, 30), // pede 2x pra compensar leads sem contato
    })

    if (!serperResp.hasResults) {
      await recordCursorRun(cursor.id, {
        leads_found: 0,
        leads_saved: 0,
        leads_duplicated: 0,
        error: serperResp.errorMessage || 'Sem resultados',
      })
      return {
        status: serperResp.errorMessage ? 'error' : 'success',
        leads_found: 0,
        leads_saved: 0,
        leads_duplicated: 0,
        error_message: serperResp.errorMessage,
        duration_ms: Date.now() - startedAt,
      }
    }

    // 4. Extrai leads do JSON bruto
    let leads = extractLeads(serperResp, {
      city: cursor.city,
      segment: cursor.segment,
      country,
      strategy: cursor.search_strategy,
    })

    // 5. Scrape de site quando lead tem website mas não tem email/phone
    const shouldScrape = config.scrape_websites !== false
    if (shouldScrape) {
      const enrichmentTasks = leads.map(async (lead) => {
        if (lead.website && (!lead.email || !lead.phone)) {
          const scraped = await scrapeContact(lead.website, country)
          lead.email = lead.email || scraped.email
          lead.phone = lead.phone || scraped.phone
          lead.whatsapp = lead.phone
          lead.instagram = lead.instagram || scraped.instagram
          lead.facebook = lead.facebook || scraped.facebook
        }
      })
      await Promise.all(enrichmentTasks)
    }

    // 6. Filtra leads sem nenhuma forma de contato
    const beforeFilter = leads.length
    leads = leads.filter((l) => l.phone || l.email).slice(0, maxLeads)

    console.log(
      `[hunter ${runId.substring(0, 8)}] extraiu ${beforeFilter} leads, ${leads.length} com contato`
    )

    // 7. Dedup + insert
    const { saved, duplicated } = await persistLeads(leads, org, agent, cursor.segment)

    // 8. Atualiza cursor
    await recordCursorRun(cursor.id, {
      leads_found: leads.length,
      leads_saved: saved,
      leads_duplicated: duplicated,
    })

    return {
      status: 'success',
      leads_found: leads.length,
      leads_saved: saved,
      leads_duplicated: duplicated,
      duration_ms: Date.now() - startedAt,
    }
  } catch (err: any) {
    console.error(`[hunter ${runId.substring(0, 8)}] erro:`, err)
    return {
      status: 'error',
      leads_found: 0,
      leads_saved: 0,
      leads_duplicated: 0,
      error_message: err.message || 'Erro desconhecido',
      duration_ms: Date.now() - startedAt,
    }
  }
}

/**
 * Persiste leads no Supabase — 1 por vez pra dedup correto.
 * Dedup por (org_id, phone) e (org_id, email) — se já existe, conta como duplicado.
 */
async function persistLeads(
  leads: RawLead[],
  org: RunnerInput['org'],
  agent: any,
  segment: string
): Promise<{ saved: number; duplicated: number }> {
  let saved = 0
  let duplicated = 0

  for (const lead of leads) {
    // Confere dedup por phone
    if (lead.phone) {
      const { data: existing } = await supabase
        .from('leads')
        .select('id')
        .eq('org_id', org.id)
        .eq('phone', lead.phone)
        .limit(1)
        .maybeSingle()

      if (existing) {
        duplicated++
        continue
      }
    }

    // Confere dedup por email
    if (lead.email) {
      const { data: existing } = await supabase
        .from('leads')
        .select('id')
        .eq('org_id', org.id)
        .eq('email', lead.email)
        .limit(1)
        .maybeSingle()

      if (existing) {
        duplicated++
        continue
      }
    }

    // Insert (whitelist conservadora — só colunas que sabemos que existem)
    const insertPayload: Record<string, any> = {
      org_id: org.id,
      name: lead.nome_pessoa || null,
      nome_empresa: lead.nome_empresa,
      phone: lead.phone,
      email: lead.email,
      city: lead.city,
      url_site: lead.website,
      instagram: lead.instagram,
      nicho: segment,
      source: 'agente_captacao',
      stage: 'novo',
    }

    const { error } = await supabase.from('leads').insert(insertPayload)

    if (error) {
      console.warn(`[hunter] erro ao inserir lead ${lead.nome_empresa}:`, error.message)
      continue
    }

    saved++
  }

  return { saved, duplicated }
}
