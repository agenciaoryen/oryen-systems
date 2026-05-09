// app/api/coach/conversation/route.ts
// GET /api/coach/conversation — Conversation management + daily greeting check

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth, resolveOrgId, supabaseAdmin } from '@/lib/api-auth'
import { loadCoachData } from '@/lib/coach/intake'
import { buildGreetingPrompt } from '@/lib/coach/prompt-builder'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

async function generateDailyGreeting(
  orgId: string,
  userId: string,
  lang: string
): Promise<{ conversationId: string; greeting: { role: string; body: string; message_type: string; created_at: string } }> {
  // Load data
  const [data, { data: memoryRows }, { data: userProfile }, { data: orgInfo }] = await Promise.all([
    loadCoachData(orgId, userId),
    supabaseAdmin.from('coach_memory').select('key, value').eq('org_id', orgId).eq('user_id', userId),
    supabaseAdmin.from('users').select('full_name').eq('id', userId).single(),
    supabaseAdmin.from('orgs').select('name, niche, language').eq('id', orgId).single(),
  ])

  const memory: Record<string, any> = {}
  for (const row of memoryRows || []) {
    memory[row.key] = row.value
  }

  // Build greeting prompt
  const greetingPrompt = buildGreetingPrompt({
    user_name: userProfile?.full_name || 'Corretor',
    org_name: orgInfo?.name || 'sua imobiliária',
    org_language: orgInfo?.language || 'pt',
    lang: (lang as 'pt' | 'en' | 'es') || 'pt',
    data,
    memory,
    conversation_history: [],
  })

  // Generate greeting via Claude (fast model — Haiku is enough for greeting)
  let greetingText = ''
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: greetingPrompt,
      messages: [{ role: 'user', content: 'Gere a saudação de hoje.' }],
    })
    greetingText = response.content[0].type === 'text' ? response.content[0].text : ''
  } catch {
    // Fallback greeting if Claude fails
    const timeGreeting = data.context.time_of_day === 'manhã' ? 'Bom dia' :
      data.context.time_of_day === 'tarde' ? 'Boa tarde' : 'Boa noite'
    greetingText = `${timeGreeting}, ${userProfile?.full_name || 'Corretor'}! Como posso ajudar com sua rotina hoje?`
  }

  // Create conversation
  const { data: conversation } = await supabaseAdmin
    .from('coach_conversations')
    .insert({
      org_id: orgId,
      user_id: userId,
      status: 'active',
      message_count: 1,
      last_message_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (!conversation) throw new Error('Failed to create conversation')

  // Save greeting message
  const { data: msg } = await supabaseAdmin
    .from('coach_messages')
    .insert({
      coach_conversation_id: conversation.id,
      org_id: orgId,
      role: 'coach',
      body: greetingText,
      message_type: 'greeting',
    })
    .select('id, role, body, message_type, created_at')
    .single()

  return {
    conversationId: conversation.id,
    greeting: msg || { role: 'coach', body: greetingText, message_type: 'greeting', created_at: new Date().toISOString() },
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(req.url)
    const orgId = resolveOrgId(auth, searchParams.get('org_id'))
    const checkGreeting = searchParams.get('check_greeting') === 'true'
    const conversationId = searchParams.get('id')
    const userLang = searchParams.get('lang') || 'pt'

    // Niche gate — coach only available for real_estate
    const { data: orgCheck } = await supabaseAdmin
      .from('orgs')
      .select('niche')
      .eq('id', orgId)
      .single()
    if (orgCheck?.niche && orgCheck.niche !== 'real_estate') {
      return NextResponse.json({ error: 'Coach not available for this niche' }, { status: 403 })
    }

    // Return specific conversation with messages
    if (conversationId) {
      const [{ data: conversation }, { data: messages }] = await Promise.all([
        supabaseAdmin
          .from('coach_conversations')
          .select('*')
          .eq('id', conversationId)
          .eq('org_id', orgId)
          .single(),
        supabaseAdmin
          .from('coach_messages')
          .select('*')
          .eq('coach_conversation_id', conversationId)
          .order('created_at', { ascending: true }),
      ])

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }

      return NextResponse.json({ conversation, messages: messages || [] })
    }

    // Check for today's conversation (proactive greeting)
    if (checkGreeting) {
      const todayStart = new Date().toISOString().split('T')[0]
      const { data: todayConv } = await supabaseAdmin
        .from('coach_conversations')
        .select('id')
        .eq('org_id', orgId)
        .eq('user_id', auth.userId)
        .eq('status', 'active')
        .gte('created_at', todayStart)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (todayConv) {
        // Already has a conversation today — return it with messages
        const { data: messages } = await supabaseAdmin
          .from('coach_messages')
          .select('*')
          .eq('coach_conversation_id', todayConv.id)
          .order('created_at', { ascending: true })

        return NextResponse.json({
          conversation_id: todayConv.id,
          messages: messages || [],
          is_new: false,
        })
      }

      // No conversation today — generate greeting
      const { conversationId: newConvId, greeting } = await generateDailyGreeting(orgId, auth.userId, userLang)

      return NextResponse.json({
        conversation_id: newConvId,
        messages: [greeting],
        is_new: true,
      })
    }

    // List conversations
    const { data: conversations } = await supabaseAdmin
      .from('coach_conversations')
      .select('id, title, message_count, last_message_at, created_at')
      .eq('org_id', orgId)
      .eq('user_id', auth.userId)
      .order('last_message_at', { ascending: false })
      .limit(20)

    return NextResponse.json({ conversations: conversations || [] })
  } catch (err: any) {
    console.error('[Coach] Conversation error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
