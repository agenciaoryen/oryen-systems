// lib/financial/constants.ts

import type { CommissionTier, ExpenseCategory, CommissionStatus, TransactionStatus, ApprovalStatus } from './types'

// ═══════════════════════════════════════════════════════════════════════════════
// EXPENSE CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

export interface CategoryConfig {
  key: ExpenseCategory
  icon: string    // emoji for simplicity (rendered in components)
  color: string   // CSS variable or hex
}

export const EXPENSE_CATEGORIES: CategoryConfig[] = [
  { key: 'marketing',  icon: '📢', color: '#6366f1' },
  { key: 'office',     icon: '🏢', color: '#8b5cf6' },
  { key: 'travel',     icon: '✈️', color: '#0ea5e9' },
  { key: 'tools',      icon: '🔧', color: '#f59e0b' },
  { key: 'personnel',  icon: '👥', color: '#10b981' },
  { key: 'taxes',      icon: '📋', color: '#ef4444' },
  { key: 'other',      icon: '📦', color: '#6b7280' },
]

export const EXPENSE_CATEGORY_MAP = Object.fromEntries(
  EXPENSE_CATEGORIES.map(c => [c.key, c])
) as Record<ExpenseCategory, CategoryConfig>

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS LABELS (pt/en/es)
// ═══════════════════════════════════════════════════════════════════════════════

export const COMMISSION_STATUS_LABELS: Record<string, Record<CommissionStatus, string>> = {
  pt: { pending: 'Pendente', approved: 'Aprovada', paid: 'Paga', cancelled: 'Cancelada' },
  en: { pending: 'Pending', approved: 'Approved', paid: 'Paid', cancelled: 'Cancelled' },
  es: { pending: 'Pendiente', approved: 'Aprobada', paid: 'Pagada', cancelled: 'Cancelada' },
}

export const TRANSACTION_STATUS_LABELS: Record<string, Record<TransactionStatus, string>> = {
  pt: { pending: 'Pendente', confirmed: 'Confirmada', cancelled: 'Cancelada' },
  en: { pending: 'Pending', confirmed: 'Confirmed', cancelled: 'Cancelled' },
  es: { pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada' },
}

export const APPROVAL_STATUS_LABELS: Record<string, Record<ApprovalStatus, string>> = {
  pt: { pending: 'Pendente', approved: 'Aprovada', rejected: 'Rejeitada' },
  en: { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' },
  es: { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' },
}

export const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  pt: {
    deal_closed: 'Negócio Fechado',
    marketing: 'Marketing',
    office: 'Escritório',
    travel: 'Viagem',
    tools: 'Ferramentas',
    personnel: 'Pessoal',
    taxes: 'Impostos',
    other: 'Outros',
  },
  en: {
    deal_closed: 'Deal Closed',
    marketing: 'Marketing',
    office: 'Office',
    travel: 'Travel',
    tools: 'Tools',
    personnel: 'Personnel',
    taxes: 'Taxes',
    other: 'Other',
  },
  es: {
    deal_closed: 'Negocio Cerrado',
    marketing: 'Marketing',
    office: 'Oficina',
    travel: 'Viaje',
    tools: 'Herramientas',
    personnel: 'Personal',
    taxes: 'Impuestos',
    other: 'Otros',
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMISSION DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_COMMISSION_TIERS: CommissionTier[] = [
  { up_to: null, rate: 5.0 }
]

export const DEFAULT_AGENCY_SPLIT = 50
export const DEFAULT_BROKER_SPLIT = 50

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS COLORS
// ═══════════════════════════════════════════════════════════════════════════════

export const COMMISSION_STATUS_COLORS: Record<CommissionStatus, { bg: string; text: string; border: string }> = {
  pending:   { bg: 'rgba(245, 158, 11, 0.08)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' },
  approved:  { bg: 'rgba(99, 102, 241, 0.08)', text: '#6366f1', border: 'rgba(99, 102, 241, 0.2)' },
  paid:      { bg: 'rgba(16, 185, 129, 0.08)', text: '#10b981', border: 'rgba(16, 185, 129, 0.2)' },
  cancelled: { bg: 'rgba(107, 114, 128, 0.08)', text: '#6b7280', border: 'rgba(107, 114, 128, 0.2)' },
}

export const TRANSACTION_STATUS_COLORS: Record<TransactionStatus, { bg: string; text: string; border: string }> = {
  pending:   { bg: 'rgba(245, 158, 11, 0.08)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' },
  confirmed: { bg: 'rgba(16, 185, 129, 0.08)', text: '#10b981', border: 'rgba(16, 185, 129, 0.2)' },
  cancelled: { bg: 'rgba(107, 114, 128, 0.08)', text: '#6b7280', border: 'rgba(107, 114, 128, 0.2)' },
}
