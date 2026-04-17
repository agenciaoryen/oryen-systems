// lib/permissions.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Sistema de permissões por role (por organização)
// ═══════════════════════════════════════════════════════════════════════════════
// Roles:
//   - 'staff'    → MASTER global (time Oryen). Acesso total, bypass tudo.
//   - 'admin'    → admin da org. Acesso total dentro da org.
//   - 'vendedor' → role padrão, permissões configuráveis pelo admin.
//   - <custom>   → roles criados pelo admin (ex: "gestor", "aux_financas").
// ═══════════════════════════════════════════════════════════════════════════════

import { supabaseAdmin } from './api-auth'

// ─── MÓDULOS DISPONÍVEIS (chaves de permissão) ───

export const PERMISSION_MODULES = [
  // Comercial
  'crm',
  'messages',
  'calendar',
  'distribution',
  'goals',
  // IA
  'agents',
  'follow_up',
  'analytics',
  // Imóveis
  'portfolio',
  'property_stats',
  'site',
  // Financeiro
  'financial',
  'subscription',
  // Ferramentas
  'whatsapp',
  'documents',
  'reports',
  'financing',
] as const

export type PermissionModule = (typeof PERMISSION_MODULES)[number]

// ─── METADADOS PARA UI ───

export const MODULE_LABELS: Record<PermissionModule, { pt: string; group: string }> = {
  crm: { pt: 'CRM / Leads', group: 'Comercial' },
  messages: { pt: 'Conversas', group: 'Comercial' },
  calendar: { pt: 'Calendário', group: 'Comercial' },
  distribution: { pt: 'Distribuição', group: 'Comercial' },
  goals: { pt: 'Metas', group: 'Comercial' },
  agents: { pt: 'Agentes SDR', group: 'IA & Automação' },
  follow_up: { pt: 'Follow-up', group: 'IA & Automação' },
  analytics: { pt: 'Analytics IA', group: 'IA & Automação' },
  portfolio: { pt: 'Portfólio', group: 'Imóveis' },
  property_stats: { pt: 'Estatísticas de Imóveis', group: 'Imóveis' },
  site: { pt: 'Meu Site', group: 'Imóveis' },
  financial: { pt: 'Financeiro', group: 'Financeiro' },
  subscription: { pt: 'Assinatura', group: 'Financeiro' },
  whatsapp: { pt: 'WhatsApp', group: 'Ferramentas' },
  documents: { pt: 'Documentos', group: 'Ferramentas' },
  reports: { pt: 'Relatórios', group: 'Ferramentas' },
  financing: { pt: 'Financiamento', group: 'Ferramentas' },
}

export const MODULE_GROUPS = ['Comercial', 'IA & Automação', 'Imóveis', 'Financeiro', 'Ferramentas'] as const

// ─── DEFAULTS DO VENDEDOR (usado quando role não tem permissions salvas) ───

export const DEFAULT_VENDEDOR_PERMISSIONS: Record<PermissionModule, boolean> = {
  crm: true,
  messages: true,
  calendar: true,
  distribution: false,
  goals: true,
  agents: false,
  follow_up: false,
  analytics: false,
  portfolio: true,
  property_stats: false,
  site: false,
  financial: false,
  subscription: false,
  whatsapp: false,
  documents: true,
  reports: true,
  financing: false,
}

// Role padrão para roles customizados (tudo bloqueado — admin libera o que quiser)
export const DEFAULT_CUSTOM_PERMISSIONS: Record<PermissionModule, boolean> = Object.fromEntries(
  PERMISSION_MODULES.map((m) => [m, false])
) as Record<PermissionModule, boolean>

// ─── TIPOS ───

export type OrgRole = {
  id: string
  org_id: string
  name: string
  slug: string
  is_system: boolean
  is_admin: boolean
  permissions: Partial<Record<PermissionModule, boolean>>
}

// ─── CORE: hasPermission ───
// Regras de acesso total:
//   - staff  → sempre true
//   - admin  → sempre true
//   - outros → consulta o role no banco
export function hasFullAccess(role: string): boolean {
  return role === 'staff' || role === 'admin'
}

export function evaluatePermission(
  role: OrgRole | null,
  module: PermissionModule
): boolean {
  if (!role) return false
  if (role.is_admin) return true
  return role.permissions?.[module] === true
}

// ─── FETCH: carrega o role completo do usuário ───

export async function getUserRole(
  userId: string,
  orgId: string | null
): Promise<{ roleSlug: string; orgRole: OrgRole | null }> {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  const roleSlug = user?.role || 'vendedor'

  // staff não tem entrada em org_roles — é global
  if (roleSlug === 'staff' || !orgId) {
    return { roleSlug, orgRole: null }
  }

  const { data: role } = await supabaseAdmin
    .from('org_roles')
    .select('*')
    .eq('org_id', orgId)
    .eq('slug', roleSlug)
    .maybeSingle()

  return { roleSlug, orgRole: role as OrgRole | null }
}

// ─── SERVER HELPER: checar permissão numa API route ───

export async function checkPermission(
  userId: string,
  orgId: string | null,
  module: PermissionModule
): Promise<boolean> {
  const { roleSlug, orgRole } = await getUserRole(userId, orgId)
  if (hasFullAccess(roleSlug)) return true
  return evaluatePermission(orgRole, module)
}

// ─── LIST: roles de uma org ───

export async function listOrgRoles(orgId: string): Promise<OrgRole[]> {
  const { data } = await supabaseAdmin
    .from('org_roles')
    .select('*')
    .eq('org_id', orgId)
    .order('is_system', { ascending: false })
    .order('created_at', { ascending: true })

  return (data as OrgRole[]) || []
}
