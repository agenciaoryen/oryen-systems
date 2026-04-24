// GET /api/prospection/team
// Lista os usuários da org para o seletor de "Visualizar dia de" do admin.
// Só admin / staff acessam.

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
      .select('id, full_name, email, role, daily_task_capacity')
      .eq('org_id', orgId)
      .order('full_name', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ users: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
