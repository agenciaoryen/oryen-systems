import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, supabaseAdmin, safeErrorResponse } from '@/lib/api-auth'

/**
 * GET /api/staff/orgs
 * Lista todas as organizações com contagens (users, leads, agents).
 * Apenas staff pode usar. Usa supabaseAdmin para bypass de RLS.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) {
      console.error('[Staff Orgs] Auth failed — user not authenticated')
      return auth
    }

    console.log('[Staff Orgs] Auth OK:', { userId: auth.userId, role: auth.role, isStaff: auth.isStaff })

    if (!auth.isStaff) {
      return NextResponse.json({ error: 'Acesso restrito a staff' }, { status: 403 })
    }

    const { data: orgsData, error } = await supabaseAdmin
      .from('orgs')
      .select('id, name, plan, plan_status, niche, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Staff Orgs] Supabase error:', error.message, error.details, error.hint)
      return NextResponse.json({ error: 'Erro ao buscar organizações' }, { status: 500 })
    }

    if (!orgsData || orgsData.length === 0) {
      return NextResponse.json([])
    }

    // Buscar contagens em paralelo
    const enriched = await Promise.all(
      orgsData.map(async (org) => {
        const [usersRes, leadsRes, agentsRes] = await Promise.all([
          supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
          supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
          supabaseAdmin.from('agents').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
        ])
        return {
          ...org,
          _user_count: usersRes.count || 0,
          _lead_count: leadsRes.count || 0,
          _agent_count: agentsRes.count || 0,
        }
      })
    )

    return NextResponse.json(enriched)
  } catch (err) {
    console.error('[Staff Orgs] Uncaught error:', err instanceof Error ? err.message : err)
    return safeErrorResponse(err, 'Erro ao buscar organizações')
  }
}
