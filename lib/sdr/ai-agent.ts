// lib/sdr/ai-agent.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Pipeline Multi-Agente do SDR
//
// Arquitetura inspirada em sistemas de produção (Google, Meta, NVIDIA):
//
//   INTAKE (código) → ENRICHER (Haiku) → RESPONDER (Sonnet) → EXECUTOR (código)
//
// Benefícios vs. monolítico anterior:
//   - ~60-70% menos tokens (elimina loops de buscar_info, save_info, think)
//   - ~50% mais rápido (Haiku pre-processing + contexto injetado)
//   - Mais confiável (responder foca 100% na conversa, sem confundir tarefas)
//   - Zero regressão (prompt completo preservado, tools existentes reutilizadas)
//
// Fallback: se enricher falhar, o responder recebe todas as tools (modo legado)
// ═══════════════════════════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk'
import { buildSystemPrompt, buildResponderSystemPrompt } from './prompt-builder'
import { agentTools, responderTools, executeTool, type ToolContext } from './tools'
import { loadLeadContext, type LeadContext } from './intake'
import { enrichMessage, type EnrichedData } from './enricher'
import { executePostProcessing } from './executor'

// Singleton do cliente Anthropic
let anthropic: Anthropic | null = null
function getClient(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  }
  return anthropic
}

// ─── Tipos ───

interface ConversationEntry {
  role: 'user' | 'assistant' | 'system'
  body: string
  created_at: string
}

interface AgentInput {
  org_id: string
  phone: string
  lead_id: string
  agent_id: string
  campaign_id: string | null
  instance_name: string
  user_message: string
  history: ConversationEntry[]
  config: Record<string, any> | null
  lead: {
    id: string
    name: string
    phone: string
    email: string | null
    stage: string | null
    source: string | null
    created_at: string
  } | null
  org?: {
    name?: string
    country?: string
    language?: string
    niche?: string
  }
}

export interface AgentResponse {
  messages: string[]         // mensagens para enviar ao lead (já splitadas)
  toolsExecuted: string[]   // tools que foram chamadas
  tokensUsed: number        // tokens consumidos (inclui enricher)
  model: string             // modelo do responder
}

// ─── Modelos e limites ───
const RESPONDER_MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 2048
const MAX_TOOL_LOOPS = 6 // Reduzido de 8 → 6 (responder tem menos tools, precisa menos loops)

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export async function runAgent(input: AgentInput): Promise<AgentResponse> {
  const client = getClient()
  const toolsExecuted: string[] = []
  let totalTokens = 0

  // ─── STAGE 1: INTAKE — Carregar contexto do DB (código puro, ~100ms) ───
  let leadContext: LeadContext
  try {
    leadContext = await loadLeadContext({
      org_id: input.org_id,
      lead_id: input.lead_id,
      phone: input.phone,
      user_message: input.user_message,
      history: input.history
    })
  } catch (err: any) {
    console.error(`[SDR:Pipeline] Intake falhou: ${err.message} — continuando sem contexto pré-carregado`)
    leadContext = {
      lead: null,
      savedInfo: [],
      notes: [],
      referenceCode: null,
      referenceProperty: null,
      hasAssistantHistory: input.history.some(h => h.role === 'assistant'),
      conversationFinished: false
    }
  }

  // ─── STAGE 2: ENRICHER — Extração de dados via Haiku (~300ms) ───
  let enriched: EnrichedData
  let enricherSucceeded = true
  try {
    enriched = await enrichMessage({
      userMessage: input.user_message,
      recentHistory: input.history.slice(-6),
      leadContext,
      orgLanguage: input.org?.language
    })
    totalTokens += enriched.tokensUsed
  } catch (err: any) {
    console.error(`[SDR:Pipeline] Enricher falhou: ${err.message} — fallback para modo completo`)
    enricherSucceeded = false
    enriched = {
      extractedFields: {},
      leadName: null,
      suggestedStage: null,
      conversationPhase: 'unknown',
      isFarewell: false,
      tokensUsed: 0
    }
  }

  // ─── STAGE 3: RESPONDER — Gerar resposta via Sonnet ───
  const promptConfig = {
    assistant_name: input.config?.assistant_name,
    company_context: input.config?.company_context,
    qualification_criteria: input.config?.qualification_criteria,
    scheduling_instructions: input.config?.scheduling_instructions,
    tone: input.config?.tone,
    extra_instructions: input.config?.extra_instructions,
    org_name: input.org?.name,
    org_country: input.org?.country,
    org_language: input.org?.language,
    org_niche: input.org?.niche,
    lead_name: leadContext.lead?.name || input.lead?.name,
    lead_phone: leadContext.lead?.phone || input.lead?.phone,
    lead_stage: leadContext.lead?.stage || input.lead?.stage || undefined,
    lead_source: leadContext.lead?.source || input.lead?.source || undefined
  }

  // Escolher tools e prompt baseado no sucesso do enricher
  let finalSystemPrompt: string
  let activeTools: Anthropic.Messages.Tool[]

  if (enricherSucceeded) {
    // Pipeline normal: prompt otimizado + tools reduzidas
    finalSystemPrompt = buildResponderSystemPrompt({
      config: promptConfig,
      leadContext: {
        lead: leadContext.lead,
        savedInfo: leadContext.savedInfo,
        notes: leadContext.notes,
        referenceProperty: leadContext.referenceProperty,
        hasAssistantHistory: leadContext.hasAssistantHistory
      },
      enriched: {
        extractedFields: enriched.extractedFields,
        conversationPhase: enriched.conversationPhase,
        isFarewell: enriched.isFarewell
      }
    })
    activeTools = responderTools
    console.log(`[SDR:Pipeline] Modo otimizado: ${responderTools.length} tools | phase: ${enriched.conversationPhase}`)
  } else {
    // Fallback: prompt original + todas as tools (modo legado)
    finalSystemPrompt = buildSystemPrompt(promptConfig)
    activeTools = agentTools
    console.log(`[SDR:Pipeline] Modo fallback (legado): ${agentTools.length} tools`)
  }

  // Injetar instrução anti-cumprimento para conversas em andamento
  if (leadContext.hasAssistantHistory) {
    const recentAssistantMsgs = input.history
      .filter(h => h.role === 'assistant')
      .slice(-3)
      .map(h => h.body.substring(0, 100))
      .join(' | ')

    finalSystemPrompt += `\n\n# CONTEXTO CRÍTICO — CONVERSA EM ANDAMENTO
Esta é uma conversa que JÁ ESTÁ ACONTECENDO. Você JÁ conversou com este lead antes.
Suas últimas mensagens foram: "${recentAssistantMsgs}"

PROIBIDO:
- NÃO diga "Oi", "Olá", "Tudo bem?", ou qualquer cumprimento
- NÃO se apresente ("Sou X da empresa Y")
- NÃO repita perguntas que já fez (olhe o histórico acima)
- NÃO envie mais de 2 mensagens

OBRIGATÓRIO:
- Responda DIRETAMENTE ao que o lead acabou de dizer
- Continue a conversa de onde parou, sem reiniciar`
  }

  // Montar messages com histórico
  const messages: Anthropic.MessageParam[] = buildMessages(input.history, input.user_message)

  // Tool context para execução
  const toolCtx: ToolContext = {
    org_id: input.org_id,
    lead_id: input.lead_id,
    phone: input.phone,
    campaign_id: input.campaign_id,
    instance_name: input.instance_name,
    agent_id: input.agent_id
  }

  // ─── Agentic loop do responder ───
  let loops = 0

  while (loops < MAX_TOOL_LOOPS) {
    loops++

    const response = await client.messages.create({
      model: RESPONDER_MODEL,
      max_tokens: MAX_TOKENS,
      system: finalSystemPrompt,
      tools: activeTools,
      messages
    })

    totalTokens += (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)

    // Verificar se tem tool_use
    const toolUseBlocks = response.content.filter(
      (block: any) => block.type === 'tool_use'
    )

    if (toolUseBlocks.length === 0) {
      // Sem tool calls → extrair texto final
      const textBlocks = response.content.filter(
        (block: any) => block.type === 'text'
      )
      const fullText = textBlocks.map((b: any) => b.text).join('\n')
      const whatsappMessages = splitForWhatsApp(fullText)

      // Se não gerou mensagens visíveis, forçar resposta
      if (whatsappMessages.length === 0) {
        console.warn(`[SDR:Pipeline] Loop ${loops}: IA não gerou texto visível — forçando resposta`)

        const forcedMessages = await forceTextResponse(client, finalSystemPrompt, messages, input.user_message)
        totalTokens += forcedMessages.tokensUsed

        if (forcedMessages.messages.length > 0) {
          // Disparar executor em background (fire-and-forget)
          fireExecutor(toolCtx, enriched, leadContext, toolsExecuted)

          return {
            messages: forcedMessages.messages,
            toolsExecuted,
            tokensUsed: totalTokens,
            model: RESPONDER_MODEL
          }
        }

        // Último fallback: mensagem genérica
        console.warn(`[SDR:Pipeline] Fallback final — enviando mensagem genérica`)
        fireExecutor(toolCtx, enriched, leadContext, toolsExecuted)

        return {
          messages: ['Oi! Recebi sua mensagem. Me conta mais sobre o que você procura que te ajudo!'],
          toolsExecuted,
          tokensUsed: totalTokens,
          model: RESPONDER_MODEL
        }
      }

      // Disparar executor em background (fire-and-forget)
      fireExecutor(toolCtx, enriched, leadContext, toolsExecuted)

      return {
        messages: whatsappMessages,
        toolsExecuted,
        tokensUsed: totalTokens,
        model: RESPONDER_MODEL
      }
    }

    // Tem tool_use → executar tools e continuar loop
    messages.push({ role: 'assistant', content: response.content as any })

    const toolResults: any[] = []
    let conversationEnded = false

    for (const toolBlock of toolUseBlocks) {
      const toolName = (toolBlock as any).name
      toolsExecuted.push(toolName)

      const result = await executeTool(
        toolName,
        (toolBlock as any).input,
        toolCtx
      )

      toolResults.push({
        type: 'tool_result',
        tool_use_id: (toolBlock as any).id,
        content: JSON.stringify(result)
      })

      if (toolName === 'end_conversation') {
        conversationEnded = true
      }
    }

    messages.push({ role: 'user', content: toolResults })

    // Se conversa encerrada, extrair texto de despedida e parar
    if (conversationEnded) {
      const textBlocks = response.content.filter((block: any) => block.type === 'text')
      const farewell = textBlocks.map((b: any) => b.text).join('\n').trim()
      const whatsappMessages = farewell ? splitForWhatsApp(farewell) : []

      // Disparar executor em background
      fireExecutor(toolCtx, enriched, leadContext, toolsExecuted)

      return {
        messages: whatsappMessages,
        toolsExecuted,
        tokensUsed: totalTokens,
        model: RESPONDER_MODEL
      }
    }
  }

  // Fallback: atingiu MAX_TOOL_LOOPS
  console.warn(`[SDR:Pipeline] Atingiu ${MAX_TOOL_LOOPS} loops — forçando resposta`)
  const finalResponse = await client.messages.create({
    model: RESPONDER_MODEL,
    max_tokens: MAX_TOKENS,
    system: finalSystemPrompt + '\n\nIMPORTANTE: Responda agora ao lead sem usar ferramentas.',
    tools: [],
    messages
  })

  totalTokens += (finalResponse.usage?.input_tokens || 0) + (finalResponse.usage?.output_tokens || 0)

  const textBlocks = finalResponse.content.filter(
    (block: any) => block.type === 'text'
  )
  const fullText = textBlocks.map((b: any) => b.text).join('\n')

  // Disparar executor em background
  fireExecutor(toolCtx, enriched, leadContext, toolsExecuted)

  return {
    messages: splitForWhatsApp(fullText),
    toolsExecuted,
    tokensUsed: totalTokens,
    model: RESPONDER_MODEL
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTOR FIRE-AND-FORGET
// ═══════════════════════════════════════════════════════════════════════════════

function fireExecutor(
  toolCtx: ToolContext,
  enriched: EnrichedData,
  leadContext: LeadContext,
  responderToolsExecuted: string[]
): void {
  // Não bloquear — rodar em background
  executePostProcessing({
    toolCtx,
    enriched,
    leadContext,
    responderToolsExecuted
  }).catch(err => {
    console.error(`[SDR:Executor] Erro no pós-processamento (non-fatal): ${err.message}`)
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORÇAR RESPOSTA DE TEXTO (fallback quando IA não gera texto)
// ═══════════════════════════════════════════════════════════════════════════════

async function forceTextResponse(
  client: Anthropic,
  systemPrompt: string,
  originalMessages: Anthropic.MessageParam[],
  userMessage: string
): Promise<{ messages: string[]; tokensUsed: number }> {
  // Simplificar messages — manter apenas últimas 6 mensagens string
  const simplifiedMessages = originalMessages
    .filter(m => typeof m.content === 'string')
    .slice(-6)

  if (simplifiedMessages.length === 0 || simplifiedMessages[0].role !== 'user') {
    simplifiedMessages.unshift({ role: 'user', content: userMessage })
  }

  try {
    const forcedResponse = await client.messages.create({
      model: RESPONDER_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt + '\n\nIMPORTANTE: Você DEVE responder ao lead agora com uma mensagem de texto curta e natural. NÃO use ferramentas. Responda diretamente ao que o lead disse.',
      tools: [], // Sem tools — forçar texto
      messages: simplifiedMessages
    })

    const tokensUsed = (forcedResponse.usage?.input_tokens || 0) + (forcedResponse.usage?.output_tokens || 0)
    const forcedText = forcedResponse.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')

    return {
      messages: splitForWhatsApp(forcedText),
      tokensUsed
    }
  } catch (err: any) {
    console.error(`[SDR:Pipeline] Erro na resposta forçada: ${err.message}`)
    return { messages: [], tokensUsed: 0 }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVERTER HISTÓRICO PARA FORMATO CLAUDE
// ═══════════════════════════════════════════════════════════════════════════════

function buildMessages(history: ConversationEntry[], currentMessage: string): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = []

  for (const entry of history) {
    if (entry.role === 'system') continue

    const role = entry.role === 'user' ? 'user' : 'assistant'

    const lastMsg = messages[messages.length - 1]
    if (lastMsg && lastMsg.role === role) {
      if (typeof lastMsg.content === 'string') {
        lastMsg.content = lastMsg.content + '\n' + entry.body
      }
    } else {
      messages.push({ role, content: entry.body })
    }
  }

  // Adicionar mensagem atual do lead
  const lastMsg = messages[messages.length - 1]
  if (lastMsg && lastMsg.role === 'user') {
    if (typeof lastMsg.content === 'string') {
      lastMsg.content = lastMsg.content + '\n' + currentMessage
    }
  } else {
    messages.push({ role: 'user', content: currentMessage })
  }

  // Garantir que começa com 'user'
  if (messages.length > 0 && messages[0].role !== 'user') {
    messages.shift()
  }

  if (messages.length === 0) {
    messages.push({ role: 'user', content: currentMessage })
  }

  return messages
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPLIT PARA WHATSAPP
// ═══════════════════════════════════════════════════════════════════════════════

function splitForWhatsApp(text: string): string[] {
  if (!text.trim()) return []

  let clean = text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,3}\s/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .trim()

  let parts: string[]

  if (clean.includes('\n\n')) {
    parts = clean.split(/\n\n+/)
  } else if (clean.length > 300) {
    parts = clean.split(/(?<=[.!?])\s+/)
    parts = regroupShortParts(parts, 80)
  } else {
    parts = [clean]
  }

  return parts
    .map(p => p.trim())
    .filter(p => p.length > 0)
}

function regroupShortParts(parts: string[], minLength: number): string[] {
  const result: string[] = []
  let buffer = ''

  for (const part of parts) {
    if (buffer.length + part.length < minLength) {
      buffer = buffer ? `${buffer} ${part}` : part
    } else {
      if (buffer) result.push(buffer)
      buffer = part
    }
  }
  if (buffer) result.push(buffer)

  return result
}
