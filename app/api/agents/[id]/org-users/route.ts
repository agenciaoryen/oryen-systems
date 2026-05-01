// app/api/agents/[id]/org-users/route.ts
// GET /api/agents/:id/org-users
//   Lista users humanos da org pro dropdown de "Aprovador responsável"
//   no perfil do colaborador IA.

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

    // Confirma que o agente é da org
    const { data: agent } = await supabase
      .from('agents')
      .select('id, org_id')
      .eq('id', agentId)
      .eq('org_id', orgId)
      .maybeSingle()
    if (!agent) {
      return NextResponse.json({ error: 'Agente não encontrado nesta org' }, { status: 404 })
    }

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
