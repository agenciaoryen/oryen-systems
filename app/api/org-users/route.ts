// app/api/org-users/route.ts
// GET /api/org-users — Lista membros ativos da organização atual
// Útil para dropdowns de "Atribuir para" em eventos, tarefas, etc.

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

    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, status')
      .eq('org_id', orgId)
      .neq('status', 'inactive')
      .order('full_name', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ users: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
