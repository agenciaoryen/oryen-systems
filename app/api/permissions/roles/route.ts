import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, resolveOrgId, supabaseAdmin, safeErrorResponse } from '@/lib/api-auth'
import { PERMISSION_MODULES, DEFAULT_CUSTOM_PERMISSIONS } from '@/lib/permissions'

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/permissions/roles
// Lista todos os roles da org ativa (sistema + custom)
// Qualquer usuário da org pode ler (precisa para o hook usePermissions funcionar)
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    const orgId = resolveOrgId(auth, req.nextUrl.searchParams.get('orgId'))

    const { data, error } = await supabaseAdmin
      .from('org_roles')
      .select('*')
      .eq('org_id', orgId)
      .order('is_system', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ roles: data || [] })
  } catch (err) {
    return safeErrorResponse(err, 'Erro ao listar roles')
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/permissions/roles
// Cria um novo role customizado. Apenas admin ou staff.
// Body: { name: string, permissions?: Record<PermissionModule, boolean> }
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    if (auth.role !== 'admin' && !auth.isStaff) {
      return NextResponse.json({ error: 'Apenas admin pode criar roles' }, { status: 403 })
    }

    const body = await req.json()
    const orgId = resolveOrgId(auth, body.orgId)
    const { name, permissions } = body

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Nome inválido (mínimo 2 caracteres)' }, { status: 400 })
    }

    const slug = slugify(name)

    if (slug === 'admin' || slug === 'staff' || slug === 'vendedor') {
      return NextResponse.json({ error: 'Este nome é reservado' }, { status: 400 })
    }

    // Sanitizar permissions: só aceitar chaves válidas
    const cleanPerms = sanitizePermissions(permissions || DEFAULT_CUSTOM_PERMISSIONS)

    const { data, error } = await supabaseAdmin
      .from('org_roles')
      .insert({
        org_id: orgId,
        name: name.trim(),
        slug,
        is_system: false,
        is_admin: false,
        permissions: cleanPerms,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Já existe um role com esse nome' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ role: data })
  } catch (err) {
    return safeErrorResponse(err, 'Erro ao criar role')
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUT /api/permissions/roles
// Atualiza permissões de um role (sistema 'vendedor' ou custom).
// Não permite editar 'admin' (sempre tem tudo).
// Body: { id: string, name?: string, permissions: Record<string, boolean> }
// ═══════════════════════════════════════════════════════════════════════════════

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    if (auth.role !== 'admin' && !auth.isStaff) {
      return NextResponse.json({ error: 'Apenas admin pode editar roles' }, { status: 403 })
    }

    const body = await req.json()
    const { id, name, permissions } = body
    const orgId = resolveOrgId(auth, body.orgId)

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })
    }

    // Buscar o role para validar
    const { data: existing } = await supabaseAdmin
      .from('org_roles')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'Role não encontrado' }, { status: 404 })
    }

    if (existing.slug === 'admin') {
      return NextResponse.json({ error: 'Admin não é editável' }, { status: 400 })
    }

    const updateData: Record<string, any> = {}

    if (permissions) {
      updateData.permissions = sanitizePermissions(permissions)
    }

    // Só permite renomear roles customizados
    if (name && !existing.is_system) {
      const cleanName = String(name).trim()
      if (cleanName.length < 2) {
        return NextResponse.json({ error: 'Nome inválido' }, { status: 400 })
      }
      updateData.name = cleanName
      updateData.slug = slugify(cleanName)
    }

    const { data, error } = await supabaseAdmin
      .from('org_roles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ role: data })
  } catch (err) {
    return safeErrorResponse(err, 'Erro ao atualizar role')
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/permissions/roles?id=xxx
// Remove um role customizado. Não permite se houver usuários vinculados.
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    if (auth.role !== 'admin' && !auth.isStaff) {
      return NextResponse.json({ error: 'Apenas admin pode remover roles' }, { status: 403 })
    }

    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })
    }

    const orgId = resolveOrgId(auth, req.nextUrl.searchParams.get('orgId'))

    const { data: existing } = await supabaseAdmin
      .from('org_roles')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'Role não encontrado' }, { status: 404 })
    }

    if (existing.is_system) {
      return NextResponse.json({ error: 'Roles de sistema não podem ser removidos' }, { status: 400 })
    }

    // Checar usuários vinculados
    const { count } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('role', existing.slug)

    if ((count || 0) > 0) {
      return NextResponse.json({
        error: `${count} usuário(s) usam este role. Mude o role deles antes de remover.`,
        userCount: count,
      }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('org_roles')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    return safeErrorResponse(err, 'Erro ao remover role')
  }
}

// ─── HELPERS ───

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
}

function sanitizePermissions(input: Record<string, any>): Record<string, boolean> {
  const clean: Record<string, boolean> = {}
  for (const mod of PERMISSION_MODULES) {
    clean[mod] = input[mod] === true
  }
  return clean
}
