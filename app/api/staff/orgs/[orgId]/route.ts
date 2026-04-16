import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, supabaseAdmin, safeErrorResponse } from '@/lib/api-auth'

/**
 * GET /api/staff/orgs/[orgId]
 * Detalhe de uma organização com users, agents, whatsapp instances.
 * Apenas staff pode usar.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    if (!auth.isStaff) {
      return NextResponse.json({ error: 'Acesso restrito a staff' }, { status: 403 })
    }

    const { orgId } = await params

    const [orgRes, usersRes, instancesRes, agentsRes, leadsRes, msgsRes, addonsRes] = await Promise.all([
      supabaseAdmin.from('orgs').select('*').eq('id', orgId).single(),
      supabaseAdmin.from('users').select('id, full_name, email, role, created_at').eq('org_id', orgId).order('created_at'),
      supabaseAdmin.from('whatsapp_instances').select('id, instance_name, status, phone_number, created_at').eq('org_id', orgId),
      supabaseAdmin.from('agents').select('id, name, agent_type, is_active').eq('org_id', orgId),
      supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
      supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }).eq('org_id', orgId).not('last_message_at', 'is', null),
      supabaseAdmin.from('org_addons').select('id, addon_type, quantity, status').eq('org_id', orgId).eq('status', 'active'),
    ])

    if (!orgRes.data) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      org: orgRes.data,
      users: usersRes.data || [],
      instances: instancesRes.data || [],
      agents: agentsRes.data || [],
      lead_count: leadsRes.count || 0,
      message_count: msgsRes.count || 0,
      addons: addonsRes.data || [],
    })
  } catch (err) {
    return safeErrorResponse(err, 'Erro ao buscar organização')
  }
}
