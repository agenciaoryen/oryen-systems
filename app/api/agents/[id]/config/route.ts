// app/api/agents/[id]/config/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Configuração do colaborador IA (agents.config jsonb).
//
// GET    /api/agents/:id/config        → lê agents.config + agents.is_paused
// PATCH  /api/agents/:id/config        → atualiza chaves específicas em config
//   body: { config: {...}, is_paused?: boolean }
//
// Apenas admin/staff. Whitelist de chaves conhecidas pra evitar lixo no jsonb.
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, resolveOrgId } from '@/lib/api-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Whitelist de chaves aceitas em agents.config (por solution_slug)
const ALLOWED_CONFIG_KEYS: Record<string, string[]> = {
  default: [
    'approval_overrides',     // { capability: 'auto' | 'pending' }
    'approver_user_id',       // user específico que aprova actions deste agente
    'language',
    'tone',
    'company_context',
  ],
  followup: [
    'cadence_hours',          // [4, 24, 72, 120, 168] em horas
    'max_attempts',           // 1..10
    'business_hours_start',   // 0..23
    'business_hours_end',     // 0..23
    'silence_threshold_hours',// horas de silêncio antes de enfileirar
    'auto_detect_enabled',    // bool — se false, só processa items já enfileirados manualmente
  ],
  followup_imobiliario: [
    'cadence_hours',
    'max_attempts',
    'business_hours_start',
    'business_hours_end',
    'silence_threshold_hours',
    'auto_detect_enabled',
  ],
  bdr_email: [
    'leads_per_day',
    'subject_lines',
  ],
  hunter_b2b: [
    'leads_per_day',
  ],
}

function getAllowedKeys(slug: string): string[] {
  return [...ALLOWED_CONFIG_KEYS.default, ...(ALLOWED_CONFIG_KEYS[slug] || [])]
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const orgId = resolveOrgId(auth, null)
    const { id } = await context.params

    const { data: agent, error } = await supabase
      .from('agents')
      .select('id, solution_slug, config, is_paused, is_active, status')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!agent) return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 })

    return NextResponse.json({ agent, allowed_keys: getAllowedKeys(agent.solution_slug) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    if (auth.role !== 'admin' && !auth.isStaff) {
      return NextResponse.json({ error: 'Somente admin pode editar config' }, { status: 403 })
    }

    const orgId = resolveOrgId(auth, null)
    const { id } = await context.params
    const body = await request.json()
    const incomingConfig = body.config as Record<string, any> | undefined
    const isPaused = body.is_paused as boolean | undefined

    const { data: agent } = await supabase
      .from('agents')
      .select('id, solution_slug, config, is_paused')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle()

    if (!agent) return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 })

    const update: Record<string, any> = { updated_at: new Date().toISOString() }

    if (incomingConfig && typeof incomingConfig === 'object') {
      const allowed = new Set(getAllowedKeys(agent.solution_slug))
      const filtered: Record<string, any> = {}
      for (const [key, value] of Object.entries(incomingConfig)) {
        if (allowed.has(key)) filtered[key] = value
      }
      // Merge com config atual (preserva chaves não enviadas)
      update.config = { ...(agent.config || {}), ...filtered }
    }

    if (typeof isPaused === 'boolean') {
      update.is_paused = isPaused
    }

    const { data: updated, error } = await supabase
      .from('agents')
      .update(update)
      .eq('id', id)
      .eq('org_id', orgId)
      .select('id, solution_slug, config, is_paused, is_active')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, agent: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
