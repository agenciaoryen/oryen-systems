// lib/coach/memory.ts
// Async memory update after each coach conversation turn
// Uses Claude Haiku 4.5 with forced tool_use for structured extraction
// Pattern: follows lib/sdr/enricher.ts — runs in ~300ms at <1k tokens, non-blocking

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import type { CoachDataSnapshot } from './intake'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MEMORY_EXTRACTION_PROMPT = `You are a memory extraction system for a business coach AI.
Analyze the conversation between the coach and the real estate broker.
Extract structured updates to the coach's long-term memory about this user.

Return a JSON object with ONLY the keys that should be updated (omit unchanged keys):
{
  "coaching_style": "directive" | "supportive" | "data_driven" | "motivational" | null,
  "weaknesses_add": ["string"],    // new weaknesses to add
  "weaknesses_remove": ["string"], // weaknesses no longer relevant
  "preferences": { "focus_areas": ["string"] } | null,
  "context_notes": "string" | null  // anything notable to remember (1-2 sentences)
}

RULES:
- coaching_style: infer from the user's language. If they respond well to direct advice → directive. If they need encouragement → supportive. If they ask for numbers → data_driven. If they talk about big goals → motivational. Only set if confident.
- weaknesses_add: areas where the user struggles (use lowercase snake_case): lead_response_time, follow_up_consistency, prospecting, pipeline_management, deal_closing, document_management, time_management, goal_setting
- weaknesses_remove: if the user mentions improvements or the data shows progress in an area
- preferences.focus_areas: topics the user explicitly asked to focus on
- context_notes: freeform observations — important context for future conversations

IMPORTANT: Be conservative. Only extract what's clearly evident. Don't invent.`

export async function updateCoachMemory(
  orgId: string,
  userId: string,
  userMessage: string,
  coachResponse: string,
  data: CoachDataSnapshot,
  existingMemory: Record<string, any>
): Promise<void> {
  try {
    const memoryContext = JSON.stringify(existingMemory).slice(0, 500)

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: MEMORY_EXTRACTION_PROMPT,
      messages: [{
        role: 'user',
        content: `EXISTING MEMORY:\n${memoryContext}\n\nUSER MESSAGE:\n${userMessage}\n\nCOACH RESPONSE:\n${coachResponse.slice(0, 500)}\n\nDATA SNAPSHOT:\n${JSON.stringify({ leads: data.leads, goals: data.goals, activity: data.activity }).slice(0, 500)}\n\nExtract memory updates as JSON:`,
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return

    const updates: Record<string, any> = {}
    try { Object.assign(updates, JSON.parse(jsonMatch[0])) } catch { return }

    // Apply coaching_style update
    if (updates.coaching_style && ['directive', 'supportive', 'data_driven', 'motivational'].includes(updates.coaching_style)) {
      await supabase
        .from('coach_memory')
        .upsert({
          org_id: orgId,
          user_id: userId,
          key: 'coaching_style',
          value: { value: updates.coaching_style, updated_at: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'org_id,user_id,key' })
    }

    // Apply weaknesses updates
    const currentWeaknesses = existingMemory.weaknesses?.value || []
    let newWeaknesses = Array.isArray(currentWeaknesses) ? [...currentWeaknesses] : []

    if (updates.weaknesses_add && Array.isArray(updates.weaknesses_add)) {
      for (const w of updates.weaknesses_add) {
        if (!newWeaknesses.includes(w)) newWeaknesses.push(w)
      }
    }
    if (updates.weaknesses_remove && Array.isArray(updates.weaknesses_remove)) {
      newWeaknesses = newWeaknesses.filter((w: string) => !updates.weaknesses_remove.includes(w))
    }
    if (updates.weaknesses_add || updates.weaknesses_remove) {
      await supabase
        .from('coach_memory')
        .upsert({
          org_id: orgId,
          user_id: userId,
          key: 'weaknesses',
          value: { value: newWeaknesses, updated_at: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'org_id,user_id,key' })
    }

    // Apply preferences
    if (updates.preferences) {
      await supabase
        .from('coach_memory')
        .upsert({
          org_id: orgId,
          user_id: userId,
          key: 'preferences',
          value: { ...existingMemory.preferences?.value, ...updates.preferences, updated_at: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'org_id,user_id,key' })
    }

    // Apply context_notes
    if (updates.context_notes && typeof updates.context_notes === 'string') {
      const existing = existingMemory.context_notes?.value || ''
      await supabase
        .from('coach_memory')
        .upsert({
          org_id: orgId,
          user_id: userId,
          key: 'context_notes',
          value: { value: updates.context_notes, updated_at: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'org_id,user_id,key' })
    }
  } catch (err) {
    // Silent failure — memory updates should never block the user
    console.error('[Coach] Memory update failed:', err)
  }
}
