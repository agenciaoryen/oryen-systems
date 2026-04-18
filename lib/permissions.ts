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

export type Lang = 'pt' | 'en' | 'es'

export const MODULE_GROUP_KEYS = ['commercial', 'ai', 'properties', 'financial', 'tools'] as const
export type ModuleGroupKey = (typeof MODULE_GROUP_KEYS)[number]

export const GROUP_LABELS: Record<ModuleGroupKey, { pt: string; en: string; es: string }> = {
  commercial: { pt: 'Comercial',       en: 'Commercial',       es: 'Comercial' },
  ai:         { pt: 'IA & Automação',  en: 'AI & Automation',  es: 'IA y Automatización' },
  properties: { pt: 'Imóveis',         en: 'Properties',       es: 'Inmuebles' },
  financial:  { pt: 'Financeiro',      en: 'Financial',        es: 'Financiero' },
  tools:      { pt: 'Ferramentas',     en: 'Tools',            es: 'Herramientas' },
}

export const MODULE_LABELS: Record<PermissionModule, { pt: string; en: string; es: string; group: ModuleGroupKey }> = {
  crm:            { pt: 'CRM / Leads',              en: 'CRM / Leads',             es: 'CRM / Leads',             group: 'commercial' },
  messages:       { pt: 'Conversas',                en: 'Conversations',           es: 'Conversaciones',          group: 'commercial' },
  calendar:       { pt: 'Calendário',               en: 'Calendar',                es: 'Calendario',              group: 'commercial' },
  distribution:   { pt: 'Distribuição',             en: 'Distribution',            es: 'Distribución',            group: 'commercial' },
  goals:          { pt: 'Metas',                    en: 'Goals',                   es: 'Metas',                   group: 'commercial' },
  agents:         { pt: 'Agentes SDR',              en: 'SDR Agents',              es: 'Agentes SDR',             group: 'ai' },
  follow_up:      { pt: 'Follow-up',                en: 'Follow-up',               es: 'Seguimiento',             group: 'ai' },
  analytics:      { pt: 'Analytics IA',             en: 'AI Analytics',            es: 'Analítica IA',            group: 'ai' },
  portfolio:      { pt: 'Portfólio',                en: 'Portfolio',               es: 'Portafolio',              group: 'properties' },
  property_stats: { pt: 'Estatísticas de Imóveis',  en: 'Property Stats',          es: 'Estadísticas de Inmuebles', group: 'properties' },
  site:           { pt: 'Meu Site',                 en: 'My Site',                 es: 'Mi Sitio',                group: 'properties' },
  financial:      { pt: 'Financeiro',               en: 'Financial',               es: 'Financiero',              group: 'financial' },
  subscription:   { pt: 'Assinatura',               en: 'Subscription',            es: 'Suscripción',             group: 'financial' },
  whatsapp:       { pt: 'WhatsApp',                 en: 'WhatsApp',                es: 'WhatsApp',                group: 'tools' },
  documents:      { pt: 'Documentos',               en: 'Documents',               es: 'Documentos',              group: 'tools' },
  reports:        { pt: 'Relatórios',               en: 'Reports',                 es: 'Informes',                group: 'tools' },
  financing:      { pt: 'Financiamento',            en: 'Financing',               es: 'Financiamiento',          group: 'tools' },
}

export const MODULE_GROUPS = MODULE_GROUP_KEYS

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

