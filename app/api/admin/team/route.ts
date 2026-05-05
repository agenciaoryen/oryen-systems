import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, resolveOrgId, supabaseAdmin } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    // Apenas admin ou staff pode ver todos os membros (inclusive inativos)
    if (!auth.isStaff && auth.role !== 'admin') {
      return NextResponse.json({ error: 'Permissão negada.' }, { status: 403 })
    }

    const orgId = resolveOrgId(auth, null)

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, full_name, name, email, role, status')
      .eq('org_id', orgId)
      .order('full_name', { ascending: true })

    if (error) {
      console.error('[API] team fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ members: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
