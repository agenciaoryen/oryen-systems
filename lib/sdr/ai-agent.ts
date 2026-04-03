// lib/sdr/ai-agent.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Core do agente SDR — Claude API com agentic tool loop
//
// Fluxo:
// 1. Monta system prompt dinâmico
// 2. Converte histórico para formato Claude messages
// 3. Envia para Claude com tools
// 4. Se Claude pede tool_use → executa → alimenta resultado → repete
// 5. Quando Claude responde com text → parseia em mensagens WhatsApp-friendly
// 6. Retorna array de mensagens para envio
// ═══════════════════════════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk'
import { buildSystemPrompt } from './prompt-builder'
import { agentTools, executeTool, type ToolContext } from './tools'

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
  tokensUsed: number        // tokens consumidos
  model: string             // modelo usado
}

// ─── Modelo e limites ───
const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 1024
const MAX_TOOL_LOOPS = 8 // máximo de loops de tool_use (segurança contra loop infinito)

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export async function runAgent(input: AgentInput): Promise<AgentResponse> {
  const client = getClient()
  const toolsExecuted: string[] = []
  let totalTokens = 0

  // 1. Montar system prompt
  const systemPrompt = buildSystemPrompt({
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
    lead_name: input.lead?.name,
    lead_phone: input.lead?.phone,
    lead_stage: input.lead?.stage || undefined,
    lead_source: input.lead?.source || undefined
  })

  // 2. Montar messages com histórico
  const messages: Anthropic.MessageParam[] = buildMessages(input.history, input.user_message)

  // 3. Tool context para execução
  const toolCtx: ToolContext = {
    org_id: input.org_id,
    lead_id: input.lead_id,
    phone: input.phone,
    campaign_id: input.campaign_id,
    instance_name: input.instance_name,
    agent_id: input.agent_id
  }

  // 4. Agentic loop
  let loops = 0

  while (loops < MAX_TOOL_LOOPS) {
    loops++

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      tools: agentTools,
      messages
    })

    totalTokens += (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)

    // Verificar se tem tool_use no response
    const toolUseBlocks = response.content.filter(
      (block: any) => block.type === 'tool_use'
    )

    if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
      // Sem tool calls → extrair texto final
      const textBlocks = response.content.filter(
        (block: any) => block.type === 'text'
      )
      const fullText = textBlocks.map(b => b.text).join('\n')
      const whatsappMessages = splitForWhatsApp(fullText)

      return {
        messages: whatsappMessages,
        toolsExecuted,
        tokensUsed: totalTokens,
        model: MODEL
      }
    }

    // Executar tools e alimentar resultados
    // Adicionar a resposta do assistant (com tool_use) ao histórico
    messages.push({ role: 'assistant', content: response.content as any })

    // Executar cada tool e montar tool_result
    const toolResults: any[] = []

    for (const toolBlock of toolUseBlocks) {
      toolsExecuted.push((toolBlock as any).name)

      const result = await executeTool(
        (toolBlock as any).name,
        (toolBlock as any).input,
        toolCtx
      )

      toolResults.push({
        type: 'tool_result',
        tool_use_id: (toolBlock as any).id,
        content: JSON.stringify(result)
      })
    }

    // Adicionar tool_results como mensagem do user
    messages.push({ role: 'user', content: toolResults })
  }

  // Fallback: se atingiu MAX_TOOL_LOOPS, forçar resposta
  console.warn(`[SDR:Agent] Atingiu ${MAX_TOOL_LOOPS} loops de tool — forçando resposta`)
  const finalResponse = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt + '\n\nIMPORTANTE: Responda agora ao lead sem usar ferramentas.',
    messages
  })

  totalTokens += (finalResponse.usage?.input_tokens || 0) + (finalResponse.usage?.output_tokens || 0)

  const textBlocks = finalResponse.content.filter(
    (block: any) => block.type === 'text'
  )
  const fullText = textBlocks.map(b => b.text).join('\n')

  return {
    messages: splitForWhatsApp(fullText),
    toolsExecuted,
    tokensUsed: totalTokens,
    model: MODEL
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVERTER HISTÓRICO PARA FORMATO CLAUDE
// ═══════════════════════════════════════════════════════════════════════════════

function buildMessages(history: ConversationEntry[], currentMessage: string): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = []

  for (const entry of history) {
    // Pular mensagens de sistema (tool results, metadata)
    if (entry.role === 'system') continue

    const role = entry.role === 'user' ? 'user' : 'assistant'

    // Claude exige alternância user/assistant. Agrupar se necessário
    const lastMsg = messages[messages.length - 1]
    if (lastMsg && lastMsg.role === role) {
      // Mesmo role consecutivo → concatenar
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

  // Garantir que começa com 'user' (requisito Claude)
  if (messages.length > 0 && messages[0].role !== 'user') {
    messages.shift()
  }

  // Garantir que não está vazio
  if (messages.length === 0) {
    messages.push({ role: 'user', content: currentMessage })
  }

  return messages
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPLIT PARA WHATSAPP
// Parseia a resposta do Claude em mensagens separadas para envio
// Portado do n8n: cada parágrafo ou bloco = uma mensagem separada
// ═══════════════════════════════════════════════════════════════════════════════

function splitForWhatsApp(text: string): string[] {
  if (!text.trim()) return []

  // Remover markdown que pode ter escapado
  let clean = text
    .replace(/\*\*(.*?)\*\*/g, '$1')  // **bold** → bold
    .replace(/\*(.*?)\*/g, '$1')       // *italic* → italic
    .replace(/#{1,3}\s/g, '')          // headers
    .replace(/```[\s\S]*?```/g, '')    // code blocks
    .replace(/`(.*?)`/g, '$1')         // inline code
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // links
    .trim()

  // Estratégia de split:
  // 1. Se tem \n\n → split por parágrafo
  // 2. Se uma mensagem > 300 chars → split por frase (. ou !)
  // 3. Filtrar vazios

  let parts: string[]

  if (clean.includes('\n\n')) {
    parts = clean.split(/\n\n+/)
  } else if (clean.length > 300) {
    // Split por frases, mantendo pontuação
    parts = clean.split(/(?<=[.!?])\s+/)
    // Reagrupar frases curtas (< 50 chars) com a próxima
    parts = regroupShortParts(parts, 80)
  } else {
    parts = [clean]
  }

  return parts
    .map(p => p.trim())
    .filter(p => p.length > 0)
}

/**
 * Reagrupa partes muito curtas em uma só mensagem.
 * Ex: ["Oi!", "Tudo bem?"] → ["Oi! Tudo bem?"]
 */
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
