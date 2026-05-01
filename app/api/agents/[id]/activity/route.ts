// app/api/agents/[id]/activity/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Folha de rastro do colaborador IA — lê agent_actions + email_sends.
//
// GET /api/agents/:id/activity?limit=50&since_id=...
//   Retorna:
//     - actions[]:    últimas N ações em agent_actions (qualquer capability)
//     - emails[]:     últimos envios em email_sends (com status delivered/opened/etc)
//     - summary:      contadores agregados das últimas 24h
//
// Usado pela tela "perfil do colaborador" pra mostrar o que ele está fazendo
// agora — versão Oryen do "Manus's Computer".
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, resolveOrgId } from '@/lib/api-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const orgId = resolveOrgId(auth, null)
    const { id: agentId } = await context.params
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50'), 200)

    // Confirma agente é da org
    const { data: agentRow } = await supabase
      .from('agents')
      .select('id, solution_slug, org_id, status, current_usage')
      .eq('id', agentId)
      .eq('org_id', orgId)
      .maybeSingle()
    if (!agentRow) {
      return NextResponse.json({ error: 'Agente não encontrado nesta org' }, { status: 404 })
    }
    const agent = {
      ...agentRow,
      is_active: agentRow.status === 'active',
      is_paused: agentRow.status === 'paused',
    }

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [actionsRes, emailsRes, summaryRes] = await Promise.all([
      // Últimas ações do kernel
      supabase
        .from('agent_actions')
        .select(`
          id, capability, kind, status, denied_reason,
          target_type, target_id,
          triggered_by_type, triggered_by_label,
          started_at, completed_at, duration_ms,
          input, result, error_message,
          approval_status
        `)
        .eq('agent_id', agentId)
        .order('started_at', { ascending: false })
        .limit(limit),

      // Últimos envios de email com status
      supabase
        .from('email_sends')
        .select(`
          id, subject, status, sent_at, delivered_at, opened_at, clicked_at,
          replied_at, bounced_at, error_message, lead_id
        `)
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(limit),

      // Contadores das últimas 24h
      supabase
        .from('agent_actions')
        .select('status, kind, capability')
        .eq('agent_id', agentId)
        .gte('started_at', last24h),
    ])

    if (actionsRes.error) {
      return NextResponse.json({ error: actionsRes.error.message }, { status: 500 })
    }

    // Resolve nome do lead pros targets que são leads (limit ~50, ok fazer 1 query)
    const actions = actionsRes.data || []
    const leadIds = Array.from(
      new Set(actions.filter((a) => a.target_type === 'lead' && a.target_id).map((a) => a.target_id))
    )
    let leadsMap: Record<string, { name: string | null; nome_empresa: string | null }> = {}
    if (leadIds.length > 0) {
      const { data: leads } = await supabase
        .from('leads')
        .select('id, name, nome_empresa')
        .in('id', leadIds)
      for (const l of leads || []) {
        leadsMap[l.id] = { name: l.name, nome_empresa: l.nome_empresa }
      }
    }

    const actionsEnriched = actions.map((a) => ({
      ...a,
      target_label:
        a.target_type === 'lead' && a.target_id && leadsMap[a.target_id]
          ? leadsMap[a.target_id].name || leadsMap[a.target_id].nome_empresa || `Lead ${a.target_id.substring(0, 8)}`
          : null,
    }))

    // Summary do últimas 24h
    const sum24h = summaryRes.data || []
    const summary = {
      total: sum24h.length,
      success: sum24h.filter((a) => a.status === 'success').length,
      failed: sum24h.filter((a) => a.status === 'failed').length,
      denied: sum24h.filter((a) => a.status === 'denied').length,
      skipped: sum24h.filter((a) => a.status === 'skipped').length,
      worker_count: sum24h.filter((a) => a.kind === 'worker').length,
      agent_count: sum24h.filter((a) => a.kind === 'agent').length,
    }

    return NextResponse.json({
      agent: {
        id: agent.id,
        solution_slug: agent.solution_slug,
        is_active: agent.is_active,
        is_paused: agent.is_paused,
      },
      actions: actionsEnriched,
      emails: emailsRes.data || [],
      summary,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
