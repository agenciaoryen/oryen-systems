// app/api/agents/[id]/instances/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Atribuição de WhatsApp instances ao agente (perspectiva "perfil do colaborador").
//
// GET    /api/agents/:id/instances
//   Retorna todas as whatsapp_instances da org dividas em:
//     assigned   → instâncias com agent_id = este agente
//     available  → instâncias da org sem agent_id (livres)
//     other      → instâncias atribuídas a OUTROS agentes (read-only aqui)
//
// PATCH  /api/agents/:id/instances
//   body: { action: 'assign' | 'unassign', instance_id: string }
//   - 'assign': seta whatsapp_instances.agent_id = este agente
//   - 'unassign': seta whatsapp_instances.agent_id = null
//
// Substitui o dropdown da tela /dashboard/whatsapp. Atribuição passa
// a ser uma decisão do gestor sobre o COLABORADOR, não sobre a ferramenta.
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

    // Confirma que o agente é da org
    const { data: agent } = await supabase
      .from('agents')
      .select('id, solution_slug, org_id')
      .eq('id', agentId)
      .eq('org_id', orgId)
      .maybeSingle()

    if (!agent) {
      return NextResponse.json({ error: 'Agente não encontrado nesta org' }, { status: 404 })
    }

    // Lista instâncias da org
    const { data: instances, error } = await supabase
      .from('whatsapp_instances')
      .select('id, instance_name, status, agent_id, api_type, phone_number, connected_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const all = instances || []
    const assigned = all.filter((i) => i.agent_id === agentId)
    const available = all.filter((i) => !i.agent_id)
    const other = all.filter((i) => i.agent_id && i.agent_id !== agentId)

    return NextResponse.json({
      agent: { id: agent.id, solution_slug: agent.solution_slug },
      assigned,
      available,
      other,
    })
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
      return NextResponse.json(
        { error: 'Somente admin pode atribuir recursos a colaboradores IA' },
        { status: 403 }
      )
    }

    const orgId = resolveOrgId(auth, null)
    const { id: agentId } = await context.params
    const body = await request.json()
    const action = body.action as 'assign' | 'unassign'
    const instanceId = body.instance_id as string

    if (!action || !instanceId || !['assign', 'unassign'].includes(action)) {
      return NextResponse.json(
        { error: 'action (assign|unassign) e instance_id obrigatórios' },
        { status: 400 }
      )
    }

    // Confirma agente é da org
    const { data: agent } = await supabase
      .from('agents')
      .select('id, org_id')
      .eq('id', agentId)
      .eq('org_id', orgId)
      .maybeSingle()
    if (!agent) {
      return NextResponse.json({ error: 'Agente não encontrado nesta org' }, { status: 404 })
    }

    // Confirma instance é da org
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('id, org_id, agent_id')
      .eq('id', instanceId)
      .eq('org_id', orgId)
      .maybeSingle()
    if (!instance) {
      return NextResponse.json({ error: 'Instância não encontrada nesta org' }, { status: 404 })
    }

    if (action === 'assign') {
      // Verifica se já está atribuída a OUTRO agente — se sim, exige confirmação
      // (caller pode passar force=true pra forçar a transferência)
      if (instance.agent_id && instance.agent_id !== agentId && body.force !== true) {
        return NextResponse.json(
          {
            error: 'Instância já está atribuída a outro colaborador. Use force=true para transferir.',
            current_agent_id: instance.agent_id,
          },
          { status: 409 }
        )
      }

      const { error } = await supabase
        .from('whatsapp_instances')
        .update({ agent_id: agentId })
        .eq('id', instanceId)
        .eq('org_id', orgId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      // unassign: só permite tirar se a instância for DESTE agente
      if (instance.agent_id !== agentId) {
        return NextResponse.json(
          { error: 'Instância não está atribuída a este colaborador' },
          { status: 400 }
        )
      }

      const { error } = await supabase
        .from('whatsapp_instances')
        .update({ agent_id: null })
        .eq('id', instanceId)
        .eq('org_id', orgId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, action, instance_id: instanceId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
