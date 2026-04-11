// lib/sdr/ai-agent.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Pipeline Multi-Agente do SDR
//
// Arquitetura:
//   INTAKE (código) → ENRICHER (Claude Haiku) → RESPONDER (OpenAI 4.1-mini) → EXECUTOR (código)
//
// O Responder usa OpenAI gpt-4.1-mini — melhor reasoning e tool calling que 4o-mini.
// O Enricher continua no Claude Haiku — mais barato para extração estruturada.
// ═══════════════════════════════════════════════════════════════════════════════

import OpenAI from 'openai'
import { buildSystemPrompt, buildResponderSystemPrompt } from './prompt-builder'
import { agentTools, responderTools, executeTool, type ToolContext } from './tools'
import { loadLeadContext, type LeadContext } from './intake'
import { enrichMessage, type EnrichedData } from './enricher'
import { executePostProcessing } from './executor'

// Singleton do cliente OpenAI
let openai: OpenAI | null = null
function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  }
  return openai
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
const RESPONDER_MODEL = 'gpt-4.1-mini'
const MAX_TOKENS = 2048
const MAX_TOOL_LOOPS = 6

// ═══════════════════════════════════════════════════════════════════════════════
// CONVERTER TOOLS: Anthropic → OpenAI format
// ═══════════════════════════════════════════════════════════════════════════════

function convertToolsToOpenAI(anthropicTools: any[]): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return anthropicTools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    }
  }))
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export async function runAgent(input: AgentInput): Promise<AgentResponse> {
  const client = getOpenAIClient()
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

  // ─── STAGE 3: RESPONDER — Gerar resposta via OpenAI gpt-4o-mini ───
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
  let activeAnthropicTools: any[]

  if (enricherSucceeded) {
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
    activeAnthropicTools = responderTools
    console.log(`[SDR:Pipeline] Modo otimizado (OpenAI): ${responderTools.length} tools | phase: ${enriched.conversationPhase}`)
  } else {
    finalSystemPrompt = buildSystemPrompt(promptConfig)
    activeAnthropicTools = agentTools
    console.log(`[SDR:Pipeline] Modo fallback (OpenAI): ${agentTools.length} tools`)
  }

  // Converter tools para formato OpenAI
  const activeTools = convertToolsToOpenAI(activeAnthropicTools)

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

  // Montar messages no formato OpenAI
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = buildOpenAIMessages(
    finalSystemPrompt,
    input.history,
    input.user_message
  )

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

    const response = await client.chat.completions.create({
      model: RESPONDER_MODEL,
      max_tokens: MAX_TOKENS,
      messages,
      tools: activeTools.length > 0 ? activeTools : undefined,
    })

    const choice = response.choices[0]
    if (!choice) break

    totalTokens += (response.usage?.prompt_tokens || 0) + (response.usage?.completion_tokens || 0)

    const assistantMessage = choice.message
    const toolCalls = assistantMessage.tool_calls || []

    if (toolCalls.length === 0) {
      // Sem tool calls → extrair texto final
      const fullText = assistantMessage.content || ''
      const whatsappMessages = splitForWhatsApp(fullText)

      // Se não gerou mensagens visíveis, forçar resposta
      if (whatsappMessages.length === 0) {
        console.warn(`[SDR:Pipeline] Loop ${loops}: IA não gerou texto visível — forçando resposta`)

        const forcedMessages = await forceTextResponse(client, finalSystemPrompt, messages, input.user_message)
        totalTokens += forcedMessages.tokensUsed

        if (forcedMessages.messages.length > 0) {
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

    // Tem tool calls → adicionar assistant message e executar tools
    messages.push(assistantMessage)

    let conversationEnded = false

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name
      toolsExecuted.push(toolName)

      let toolInput: any = {}
      try {
        toolInput = JSON.parse(toolCall.function.arguments || '{}')
      } catch {
        console.warn(`[SDR:Pipeline] Erro ao parsear arguments da tool ${toolName}`)
      }

      const result = await executeTool(toolName, toolInput, toolCtx)

      // Adicionar resultado no formato OpenAI
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result)
      })

      if (toolName === 'end_conversation') {
        conversationEnded = true
      }
    }

    // Se conversa encerrada, extrair texto de despedida e parar
    if (conversationEnded) {
      const farewell = assistantMessage.content || ''
      const whatsappMessages = farewell.trim() ? splitForWhatsApp(farewell) : []

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

  // Remover tools para forçar texto
  const finalResponse = await client.chat.completions.create({
    model: RESPONDER_MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      ...messages,
      { role: 'system', content: 'IMPORTANTE: Responda agora ao lead sem usar ferramentas. Dê uma resposta curta e natural.' }
    ],
  })

  totalTokens += (finalResponse.usage?.prompt_tokens || 0) + (finalResponse.usage?.completion_tokens || 0)

  const fullText = finalResponse.choices[0]?.message?.content || ''

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
  client: OpenAI,
  systemPrompt: string,
  originalMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  userMessage: string
): Promise<{ messages: string[]; tokensUsed: number }> {
  // Simplificar messages — manter system + últimas mensagens string
  const simplified: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt + '\n\nIMPORTANTE: Você DEVE responder ao lead agora com uma mensagem de texto curta e natural. NÃO use ferramentas. Responda diretamente ao que o lead disse.' }
  ]

  // Pegar últimas mensagens user/assistant
  const userAssistantMsgs = originalMessages
    .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-6)

  if (userAssistantMsgs.length === 0) {
    simplified.push({ role: 'user', content: userMessage })
  } else {
    simplified.push(...userAssistantMsgs)
  }

  // Garantir que começa com user após system
  if (simplified.length > 1 && simplified[1].role !== 'user') {
    simplified.splice(1, 0, { role: 'user', content: userMessage })
  }

  try {
    const forcedResponse = await client.chat.completions.create({
      model: RESPONDER_MODEL,
      max_tokens: MAX_TOKENS,
      messages: simplified,
      // Sem tools → forçar texto
    })

    const tokensUsed = (forcedResponse.usage?.prompt_tokens || 0) + (forcedResponse.usage?.completion_tokens || 0)
    const forcedText = forcedResponse.choices[0]?.message?.content || ''

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
// CONVERTER HISTÓRICO PARA FORMATO OPENAI
// ═══════════════════════════════════════════════════════════════════════════════

function buildOpenAIMessages(
  systemPrompt: string,
  history: ConversationEntry[],
  currentMessage: string
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt }
  ]

  for (const entry of history) {
    if (entry.role === 'system') continue

    const role: 'user' | 'assistant' = entry.role === 'user' ? 'user' : 'assistant'

    const lastMsg = messages[messages.length - 1]
    if (lastMsg && lastMsg.role === role && typeof lastMsg.content === 'string') {
      lastMsg.content = lastMsg.content + '\n' + entry.body
    } else {
      messages.push({ role, content: entry.body })
    }
  }

  // Adicionar mensagem atual do lead
  const lastMsg = messages[messages.length - 1]
  if (lastMsg && lastMsg.role === 'user' && typeof lastMsg.content === 'string') {
    lastMsg.content = lastMsg.content + '\n' + currentMessage
  } else {
    messages.push({ role: 'user', content: currentMessage })
  }

  // Garantir que após o system vem um 'user'
  if (messages.length > 1 && messages[1].role !== 'user') {
    messages.splice(1, 1) // remover assistant órfão
  }

  if (messages.length === 1) {
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
