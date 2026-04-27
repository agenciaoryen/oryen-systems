// GET   /api/prospection/team
//   Lista os usuários da org para o seletor de "Visualizar dia de" do admin.
// PATCH /api/prospection/team
//   Atualiza daily_task_capacity de um user (admin only). Body: {user_id, capacity}.
//   capacity=0 => opt-out (user não recebe tasks de prospecção).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, resolveOrgId } from '@/lib/api-auth'
import { ensureProspectionAccess } from '@/lib/prospection/access'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    if (auth.role !== 'admin' && !auth.isStaff) {
      return NextResponse.json({ error: 'Somente admin' }, { status: 403 })
    }

    const orgId = resolveOrgId(auth, request.nextUrl.searchParams.get('org_id'))
    const gate = await ensureProspectionAccess(orgId)
    if (gate) return gate

    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, status, daily_task_capacity')
      .eq('org_id', orgId)
      .order('full_name', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Tasks abertas + tasks criadas hoje, pra mostrar carga atual
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const enriched = await Promise.all(
      (data || []).map(async (u: any) => {
        const { count: openCount } = await supabase
          .from('prospection_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('assignee_user_id', u.id)
          .in('status', ['pending', 'in_progress', 'overdue', 'queued'])

        const { count: todayCount } = await supabase
          .from('prospection_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('assignee_user_id', u.id)
          .gte('created_at', todayStart.toISOString())

        return {
          ...u,
          open_tasks: openCount || 0,
          today_tasks: todayCount || 0,
        }
      })
    )

    return NextResponse.json({ users: enriched })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    if (auth.role !== 'admin' && !auth.isStaff) {
      return NextResponse.json({ error: 'Somente admin pode editar capacidade' }, { status: 403 })
    }

    const orgId = resolveOrgId(auth, null)
    const gate = await ensureProspectionAccess(orgId)
    if (gate) return gate

    const body = await request.json()
    const userId = body.user_id
    const capacity = Number(body.capacity)

    if (!userId || !Number.isFinite(capacity)) {
      return NextResponse.json({ error: 'user_id e capacity são obrigatórios' }, { status: 400 })
    }
    if (capacity < 0 || capacity > 500) {
      return NextResponse.json({ error: 'capacity deve estar entre 0 e 500' }, { status: 400 })
    }

    // Garante que o user pertence à org do admin
    const { data: target } = await supabase
      .from('users')
      .select('id, org_id')
      .eq('id', userId)
      .maybeSingle()

    if (!target || target.org_id !== orgId) {
      return NextResponse.json({ error: 'User não encontrado nesta org' }, { status: 404 })
    }

    const { error } = await supabase
      .from('users')
      .update({ daily_task_capacity: capacity })
      .eq('id', userId)
      .eq('org_id', orgId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
