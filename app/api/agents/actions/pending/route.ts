// app/api/agents/actions/pending/route.ts
// GET /api/agents/actions/pending — fila global de aprovações pendentes da org.
// Lê agent_actions onde approval_status='pending', enriquece com nome do
// agente e do lead pra UI exibir contexto sem N queries.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, resolveOrgId } from '@/lib/api-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const orgId = resolveOrgId(auth, null)
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50'), 200)

    const { data: actions, error } = await supabase
      .from('agent_actions')
      .select(`
        id, capability, kind,
        target_type, target_id,
        triggered_by_type, triggered_by_label,
        started_at, input,
        agent_id
      `)
      .eq('org_id', orgId)
      .eq('approval_status', 'pending')
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const items = actions || []

    // Enriquece com nome do agente e label do target (lead)
    const agentIds = Array.from(new Set(items.map((a) => a.agent_id).filter(Boolean)))
    const leadIds = Array.from(
      new Set(items.filter((a) => a.target_type === 'lead' && a.target_id).map((a) => a.target_id))
    )

    const [agentsRes, leadsRes] = await Promise.all([
      agentIds.length > 0
        ? supabase.from('agents').select('id, solution_slug').in('id', agentIds)
        : Promise.resolve({ data: [] }),
      leadIds.length > 0
        ? supabase.from('leads').select('id, name, nome_empresa, phone, email').in('id', leadIds)
        : Promise.resolve({ data: [] }),
    ])

    const agentMap = new Map((agentsRes.data || []).map((a: any) => [a.id, a]))
    const leadMap = new Map((leadsRes.data || []).map((l: any) => [l.id, l]))

    const enriched = items.map((a) => {
      const agent = agentMap.get(a.agent_id)
      const lead = a.target_type === 'lead' && a.target_id ? leadMap.get(a.target_id) : null
      return {
        ...a,
        agent_solution_slug: agent?.solution_slug || null,
        target_label: lead
          ? lead.name || lead.nome_empresa || lead.email || `Lead ${a.target_id?.substring(0, 8)}`
          : null,
        target_contact: lead ? lead.phone || lead.email : null,
      }
    })

    return NextResponse.json({
      pending: enriched,
      count: enriched.length,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
