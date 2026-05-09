// app/api/coach/chat/route.ts
// POST /api/coach/chat — Main conversational endpoint with SSE streaming
// Uses Claude Sonnet 4 with ReadableStream for real-time coaching

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth, resolveOrgId, supabaseAdmin } from '@/lib/api-auth'
import { loadCoachData } from '@/lib/coach/intake'
import { buildCoachSystemPrompt } from '@/lib/coach/prompt-builder'
import { updateCoachMemory } from '@/lib/coach/memory'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const COACH_MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 1024
const HISTORY_LIMIT = 30

function generateTitle(userMsg: string, coachMsg: string): string {
  const text = userMsg.slice(0, 80).replace(/\n/g, ' ').trim()
  return text.length >= 80 ? text.slice(0, 77) + '...' : text
}

async function getOrCreateConversation(orgId: string, userId: string, conversationId?: string | null) {
  if (conversationId) {
    const { data } = await supabaseAdmin
      .from('coach_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('org_id', orgId)
      .single()
    if (data) return data
  }

  // Create new conversation
  const { data } = await supabaseAdmin
    .from('coach_conversations')
    .insert({ org_id: orgId, user_id: userId, status: 'active' })
    .select()
    .single()

  if (!data) throw new Error('Failed to create conversation')
  return data
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    const body = await req.json()
    const orgId = resolveOrgId(auth, body.org_id)
    const { conversation_id, message } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'message required' }, { status: 400 })
    }

    // Niche gate — coach only available for real_estate
    const { data: orgCheck } = await supabaseAdmin
      .from('orgs')
      .select('niche')
      .eq('id', orgId)
      .single()
    if (orgCheck?.niche && orgCheck.niche !== 'real_estate') {
      return NextResponse.json({ error: 'Coach not available for this niche' }, { status: 403 })
    }

    // 1. Load/create conversation
    const conversation = await getOrCreateConversation(orgId, auth.userId, conversation_id)

    // 2. Load conversation history
    const { data: history } = await supabaseAdmin
      .from('coach_messages')
      .select('role, body, message_type, created_at')
      .eq('coach_conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT)
    const orderedHistory = (history || []).reverse()

    // 3. Load coach memory
    const { data: memoryRows } = await supabaseAdmin
      .from('coach_memory')
      .select('key, value')
      .eq('org_id', orgId)
      .eq('user_id', auth.userId)
    const memory: Record<string, any> = {}
    for (const row of memoryRows || []) {
      memory[row.key] = row.value
    }

    // 4. Load CRM data snapshot
    const data = await loadCoachData(orgId, auth.userId)

    // 5. Fetch user and org profiles
    const [{ data: userProfile }, { data: orgInfo }] = await Promise.all([
      supabaseAdmin.from('users').select('full_name').eq('id', auth.userId).single(),
      supabaseAdmin.from('orgs').select('name, niche, language').eq('id', orgId).single(),
    ])

    // 6. Build system prompt
    const systemPrompt = buildCoachSystemPrompt({
      user_name: userProfile?.full_name || 'Corretor',
      org_name: orgInfo?.name || 'sua imobiliária',
      org_language: orgInfo?.language || 'pt',
      lang: (orgInfo?.language as 'pt' | 'en' | 'es') || 'pt',
      data,
      memory,
      conversation_history: orderedHistory.map(h => ({ role: h.role, body: h.body })),
    })

    // 7. Save user message
    await supabaseAdmin
      .from('coach_messages')
      .insert({
        coach_conversation_id: conversation.id,
        org_id: orgId,
        role: 'user',
        body: message.trim(),
        message_type: 'text',
      })

    // 8. Build messages array for Claude (last 20 turns, alternating user/coach)
    const recentHistory = orderedHistory.slice(-20)
    const anthropicMessages: Anthropic.Messages.MessageParam[] = recentHistory.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.body,
    }))
    anthropicMessages.push({ role: 'user', content: message.trim() })

    // 9. Call Claude with streaming
    const stream = await anthropic.messages.create({
      model: COACH_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: anthropicMessages,
      stream: true,
    })

    // 10. Stream response via SSE
    const readable = new ReadableStream({
      async start(controller) {
        let fullResponse = ''
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const text = event.delta.text
              fullResponse += text
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }

          // Determine message type
          const isFirstExchange = orderedHistory.length === 0
          const msgType = isFirstExchange ? 'greeting' : 'text'

          // 11. Save coach response
          await supabaseAdmin
            .from('coach_messages')
            .insert({
              coach_conversation_id: conversation.id,
              org_id: orgId,
              role: 'coach',
              body: fullResponse,
              message_type: msgType,
            })

          // 12. Update conversation metadata
          const newCount = (conversation.message_count || 0) + 2
          await supabaseAdmin
            .from('coach_conversations')
            .update({
              message_count: newCount,
              last_message_at: new Date().toISOString(),
              title: conversation.title || generateTitle(message, fullResponse),
              updated_at: new Date().toISOString(),
            })
            .eq('id', conversation.id)

          // 13. Async memory update (non-blocking)
          updateCoachMemory(orgId, auth.userId, message, fullResponse, data, memory)
            .catch(err => console.error('[Coach] Memory update failed:', err))

          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          console.error('[Coach] Stream error:', err)
          // Save partial response if any
          if (fullResponse) {
            await supabaseAdmin
              .from('coach_messages')
              .insert({
                coach_conversation_id: conversation.id,
                org_id: orgId,
                role: 'coach',
                body: fullResponse + '\n\n[Resposta interrompida. Tente novamente.]',
                message_type: 'text',
              })
          }
          controller.error(err)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err: any) {
    console.error('[Coach] Chat error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
