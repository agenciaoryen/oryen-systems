import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, supabaseAdmin } from '@/lib/api-auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const { id: targetUserId } = await params
    const body = await request.json()
    const { status } = body

    if (!['active', 'inactive'].includes(status)) {
      return NextResponse.json({ error: 'Status inválido. Use active ou inactive.' }, { status: 400 })
    }

    // Não pode desativar a si mesmo
    if (targetUserId === auth.userId) {
      return NextResponse.json({ error: 'Você não pode alterar seu próprio status.' }, { status: 403 })
    }

    // Buscar o usuário alvo para verificar se é da mesma org
    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('org_id')
      .eq('id', targetUserId)
      .single()

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
    }

    // Apenas admin da mesma org pode alterar status (ou staff)
    if (!auth.isStaff && (auth.role !== 'admin' || auth.orgId !== targetUser.org_id)) {
      return NextResponse.json({ error: 'Permissão negada.' }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update({ status })
      .eq('id', targetUserId)

    if (error) {
      console.error('[API] Erro ao atualizar status:', error)
      return NextResponse.json({ error: 'Erro ao atualizar status.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, status })
  } catch (error: any) {
    console.error('[API] toggle status error:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
