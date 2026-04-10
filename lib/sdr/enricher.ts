// lib/sdr/enricher.ts
// ═══════════════════════════════════════════════════════════════════════════════
// ENRICHER — Extração de dados estruturados via Claude Haiku
//
// Substitui os loops de save_lead_info + think que consumiam ~15-20k tokens.
// Usa Haiku com tool_use forçado para extração 100% estruturada.
//
// Latência: ~300ms
// Custo: ~800 tokens Haiku (~60x mais barato que Sonnet)
// ═══════════════════════════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk'
import type { LeadContext } from './intake'

// Reutiliza o singleton do cliente (mesmo da ai-agent.ts)
let anthropic: Anthropic | null = null
function getClient(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  }
  return anthropic
}

// ─── Modelo ───
const ENRICHER_MODEL = 'claude-haiku-4-5-20251001'
const ENRICHER_MAX_TOKENS = 1024

// ─── Tipos ───

export interface EnrichedData {
  extractedFields: Record<string, string>  // { budget: "4000", property_type: "casa", ... }
  leadName: string | null                  // Nome detectado na mensagem
  suggestedStage: string | null            // Stage recomendado (qualifying, qualified, etc.)
  conversationPhase: 'greeting' | 'qualifying' | 'qualified' | 'scheduling' | 'post_schedule' | 'farewell' | 'objection' | 'unknown'
  isFarewell: boolean                      // Lead se despedindo / emoji de confirmação final
  tokensUsed: number
}

// ─── Tool de extração (forçado via tool_choice) ───

const extractionTool: Anthropic.Messages.Tool = {
  name: 'extract_conversation_data',
  description: 'Extrai dados estruturados da conversa do lead com o assistente imobiliário.',
  input_schema: {
    type: 'object' as const,
    properties: {
      extracted_fields: {
        type: 'object' as const,
        description: 'Campos extraídos da mensagem do lead. Incluir APENAS campos com informação NOVA (não repetir o que já foi coletado). Valores devem ser strings simples.',
        properties: {
          interest: {
            type: 'string' as const,
            description: 'Tipo de transação: "compra", "locação", "compra e locação", "investimento". Só preencher se o lead mencionou explicitamente.'
          },
          contact_type: {
            type: 'string' as const,
            description: 'Perfil do lead: "comprador", "vendedor", "locatário", "investidor". Deduzir do contexto: quem busca locação = locatário.'
          },
          property_type: {
            type: 'string' as const,
            description: 'Tipo de imóvel: "casa", "apartamento", "terreno", "comercial", "rural"'
          },
          region: {
            type: 'string' as const,
            description: 'Região/bairro onde o lead QUER BUSCAR imóvel (NÃO é onde mora)'
          },
          lead_city: {
            type: 'string' as const,
            description: 'Cidade onde o lead MORA atualmente (NÃO é onde quer buscar)'
          },
          budget: {
            type: 'string' as const,
            description: 'Orçamento em número COMPLETO. "4 mil" = "4000", "250 mil" = "250000", "4.000" = "4000". NUNCA abreviar.'
          },
          bedrooms: {
            type: 'string' as const,
            description: 'Número de quartos/suítes desejados'
          },
          financing: {
            type: 'string' as const,
            description: 'Forma de pagamento: "financiamento", "à vista", "permuta"'
          },
          urgency: {
            type: 'string' as const,
            description: 'Urgência: "imediata", "1-3 meses", "3-6 meses", "pesquisando"'
          },
          current_situation: {
            type: 'string' as const,
            description: 'Situação atual: "mora de aluguel", "vai vender outro imóvel", etc.'
          }
        },
        additionalProperties: false
      },
      lead_name: {
        type: 'string' as const,
        description: 'Nome do lead se ele se apresentou na mensagem. null se não mencionou. Não incluir nome já conhecido.'
      },
      suggested_stage: {
        type: 'string' as const,
        enum: ['qualifying', 'qualified', 'visit_scheduled', 'lost'],
        description: 'Stage recomendado baseado na análise. qualifying = começou a dar informações. qualified = tem interesse real + orçamento + urgência. null = sem mudança. NÃO sugerir visit_scheduled (isso é feito pelo schedule_visit).'
      },
      conversation_phase: {
        type: 'string' as const,
        enum: ['greeting', 'qualifying', 'qualified', 'scheduling', 'post_schedule', 'farewell', 'objection', 'unknown'],
        description: 'Fase atual da conversa. greeting = primeiro contato. qualifying = coletando dados. qualified = pronto para agendar. scheduling = negociando horário. post_schedule = visita já agendada. farewell = lead se despedindo. objection = lead com objeção.'
      },
      is_farewell: {
        type: 'boolean' as const,
        description: 'true se o lead está claramente encerrando (tchau, obrigado, 👍 após visita agendada, ok final). false caso contrário.'
      }
    },
    required: ['extracted_fields', 'conversation_phase', 'is_farewell']
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

interface EnricherParams {
  userMessage: string
  recentHistory: { role: string; body: string }[]  // últimas 4-6 mensagens
  leadContext: LeadContext
  orgLanguage?: string
}

export async function enrichMessage(params: EnricherParams): Promise<EnrichedData> {
  const { userMessage, recentHistory, leadContext, orgLanguage } = params
  const client = getClient()

  // Montar contexto compacto para o enricher
  const alreadyCollected = buildAlreadyCollected(leadContext)
  const conversationExcerpt = buildConversationExcerpt(recentHistory, userMessage)
  const lang = orgLanguage === 'en' ? 'English' : orgLanguage === 'es' ? 'Spanish' : 'Portuguese (Brazil)'

  const systemPrompt = `You are a data extraction specialist for a real estate SDR system.
Your job: analyze the lead's latest WhatsApp message and extract structured data.

RULES:
- Extract ONLY NEW information from the current message (do not repeat already collected data)
- Budget must be a COMPLETE number: "4 mil" = "4000", "250k" = "250000", "4.000" (Brazilian) = "4000"
- "region" = where the lead WANTS to search. "lead_city" = where the lead LIVES. Do NOT confuse these.
- "interest" = transaction type (compra/locação). "contact_type" = lead profile (comprador/locatário). DEDUCE contact_type from interest when possible.
- If the lead said nothing new about a field, do NOT include it in extracted_fields.
- Analyze the conversation phase based on the full context, not just the last message.
- is_farewell = true ONLY if lead is clearly ending (bye, thanks + no new question, 👍/ok after visit scheduled)
- The conversation language is ${lang}.

ALREADY COLLECTED DATA (do not re-extract):
${alreadyCollected || '(nothing collected yet)'}

CURRENT LEAD STAGE: ${leadContext.lead?.stage || 'new'}`

  try {
    const response = await client.messages.create({
      model: ENRICHER_MODEL,
      max_tokens: ENRICHER_MAX_TOKENS,
      system: systemPrompt,
      tools: [extractionTool],
      tool_choice: { type: 'tool', name: 'extract_conversation_data' },
      messages: [{
        role: 'user',
        content: conversationExcerpt
      }]
    })

    const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)

    // Extrair resultado do tool_use
    const toolBlock = response.content.find((b: any) => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      console.warn('[SDR:Enricher] Haiku não retornou tool_use — usando defaults')
      return defaultEnrichedData(tokensUsed)
    }

    const input = toolBlock.input as any

    // Filtrar campos vazios/undefined do extracted_fields
    const extractedFields: Record<string, string> = {}
    if (input.extracted_fields) {
      for (const [key, value] of Object.entries(input.extracted_fields)) {
        if (value && typeof value === 'string' && value.trim()) {
          extractedFields[key] = (value as string).trim()
        }
      }
    }

    console.log(`[SDR:Enricher] Extraídos ${Object.keys(extractedFields).length} campos | phase: ${input.conversation_phase} | farewell: ${input.is_farewell} | name: ${input.lead_name || 'none'} | stage: ${input.suggested_stage || 'none'} | tokens: ${tokensUsed}`)

    return {
      extractedFields,
      leadName: input.lead_name || null,
      suggestedStage: input.suggested_stage || null,
      conversationPhase: input.conversation_phase || 'unknown',
      isFarewell: input.is_farewell === true,
      tokensUsed
    }
  } catch (err: any) {
    console.error(`[SDR:Enricher] Erro: ${err.message} — usando defaults`)
    return defaultEnrichedData(0)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function defaultEnrichedData(tokensUsed: number): EnrichedData {
  return {
    extractedFields: {},
    leadName: null,
    suggestedStage: null,
    conversationPhase: 'unknown',
    isFarewell: false,
    tokensUsed
  }
}

function buildAlreadyCollected(ctx: LeadContext): string {
  const lines: string[] = []

  // Dados do CRM
  if (ctx.lead?.interesse) lines.push(`- interest: ${ctx.lead.interesse}`)
  if (ctx.lead?.tipo_contato) lines.push(`- contact_type: ${ctx.lead.tipo_contato}`)
  if (ctx.lead?.nicho) lines.push(`- property_type: ${ctx.lead.nicho}`)
  if (ctx.lead?.city) lines.push(`- lead_city: ${ctx.lead.city}`)
  if (ctx.lead?.total_em_vendas) lines.push(`- budget: ${ctx.lead.total_em_vendas}`)

  // Dados de saved_info
  for (const entry of ctx.savedInfo) {
    const key = entry.field
    // Evitar duplicar o que já veio do CRM
    if (['interesse', 'tipo_contato', 'nicho', 'city', 'total_em_vendas'].includes(key)) continue
    lines.push(`- ${key}: ${entry.value}`)
  }

  return lines.join('\n')
}

function buildConversationExcerpt(
  recentHistory: { role: string; body: string }[],
  currentMessage: string
): string {
  // Pegar últimas 4 mensagens + mensagem atual (contexto mínimo para extração)
  const recent = recentHistory
    .filter(h => h.role === 'user' || h.role === 'assistant')
    .slice(-4)
    .map(h => `${h.role === 'user' ? 'Lead' : 'Assistente'}: ${h.body.slice(0, 300)}`)
    .join('\n')

  return `${recent ? recent + '\n' : ''}Lead: ${currentMessage}`
}
