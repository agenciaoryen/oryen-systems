// lib/sdr/executor.ts
// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTOR — Pós-processamento de dados (fire-and-forget)
//
// Recebe os dados extraídos pelo enricher e persiste no banco de dados
// usando as mesmas funções do tools.ts (zero regressão na lógica).
//
// Roda APÓS o responder enviar a resposta — não bloqueia o lead.
// Se falhar, a resposta ao lead já foi enviada. Dados serão coletados
// na próxima interação pelo enricher.
//
// Latência: ~100ms (queries DB paralelas)
// Custo: 0 tokens
// ═══════════════════════════════════════════════════════════════════════════════

import { executeTool, type ToolContext } from './tools'
import type { EnrichedData } from './enricher'
import type { LeadContext } from './intake'

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

interface ExecutorParams {
  toolCtx: ToolContext
  enriched: EnrichedData
  leadContext: LeadContext
  responderToolsExecuted: string[]  // Tools que o responder já executou
}

export async function executePostProcessing(params: ExecutorParams): Promise<void> {
  const { toolCtx, enriched, leadContext, responderToolsExecuted } = params
  const tasks: Promise<void>[] = []

  // ─── 1. Salvar campos extraídos pelo enricher ───
  // Cada campo usa executeTool('save_lead_info') que preserva toda a lógica:
  // - Parsing de budget brasileiro (4.000 → 4000)
  // - Mapeamento para colunas do lead (interest → interesse, etc.)
  // - Registro na timeline (lead_events)
  // - Salvamento de metadata (sdr_messages)
  for (const [field, value] of Object.entries(enriched.extractedFields)) {
    // Evitar re-salvar dados que já estão no CRM com o mesmo valor
    if (isAlreadySaved(field, value, leadContext)) continue

    tasks.push(
      executeTool('save_lead_info', { field, value }, toolCtx)
        .then(result => {
          if (!result.success) {
            console.warn(`[SDR:Executor] Falha ao salvar ${field}: ${result.error}`)
          }
        })
        .catch(err => {
          console.warn(`[SDR:Executor] Erro ao salvar ${field}: ${err.message}`)
        })
    )
  }

  // ─── 2. Atualizar nome do lead se detectado ───
  if (enriched.leadName && enriched.leadName !== leadContext.lead?.name) {
    tasks.push(
      executeTool('update_lead_name', { name: enriched.leadName }, toolCtx)
        .then(result => {
          if (!result.success) {
            console.warn(`[SDR:Executor] Falha ao atualizar nome: ${result.error}`)
          }
        })
        .catch(err => {
          console.warn(`[SDR:Executor] Erro ao atualizar nome: ${err.message}`)
        })
    )
  }

  // ─── 3. Atualizar stage se sugerido pelo enricher ───
  // Só atualizar se:
  // - O enricher sugeriu um stage
  // - O responder NÃO executou qualify_lead ou schedule_visit (que já atualizam stage)
  // - A proteção de retrocesso no executeTool cuida do resto
  if (
    enriched.suggestedStage &&
    !responderToolsExecuted.includes('qualify_lead') &&
    !responderToolsExecuted.includes('schedule_visit')
  ) {
    const reason = `Enriquecimento automático: conversa na fase "${enriched.conversationPhase}"`
    tasks.push(
      executeTool('qualify_lead', { stage: enriched.suggestedStage, reason }, toolCtx)
        .then(result => {
          if (result.success && result.data?.blocked) {
            // Stage retrocession blocked — expected behavior
            console.log(`[SDR:Executor] Stage ${enriched.suggestedStage} bloqueado (retrocesso) — ok`)
          }
        })
        .catch(err => {
          console.warn(`[SDR:Executor] Erro ao atualizar stage: ${err.message}`)
        })
    )
  }

  // Executar tudo em paralelo (fire-and-forget)
  if (tasks.length > 0) {
    const startMs = Date.now()
    await Promise.allSettled(tasks)
    const elapsed = Date.now() - startMs
    console.log(`[SDR:Executor] ${tasks.length} tarefa(s) executadas em ${elapsed}ms`)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verifica se um campo já foi salvo com o mesmo valor no CRM.
 * Evita chamadas desnecessárias ao banco.
 */
function isAlreadySaved(field: string, value: string, ctx: LeadContext): boolean {
  if (!ctx.lead) return false

  const normalizedValue = value.toLowerCase().trim()

  switch (field) {
    case 'interest':
      return ctx.lead.interesse?.toLowerCase().trim() === normalizedValue
    case 'contact_type':
      return ctx.lead.tipo_contato?.toLowerCase().trim() === normalizedValue
    case 'property_type':
      return ctx.lead.nicho?.toLowerCase().trim() === normalizedValue
    case 'lead_city':
      return ctx.lead.city?.toLowerCase().trim() === normalizedValue
    case 'budget': {
      // Comparar numericamente
      const existingBudget = ctx.lead.total_em_vendas
      if (!existingBudget) return false
      const newBudget = parseFloat(value.replace(/[^\d.]/g, ''))
      return !isNaN(newBudget) && existingBudget === newBudget
    }
    default:
      // Para campos de metadata (region, bedrooms, etc.), verificar no savedInfo
      return ctx.savedInfo.some(
        s => s.field === field && s.value.toLowerCase().trim() === normalizedValue
      )
  }
}
