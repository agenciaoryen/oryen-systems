'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/format'
import { useAuth } from '@/lib/AuthContext'
import {
  EXPENSE_CATEGORIES,
  CATEGORY_LABELS,
  TRANSACTION_STATUS_COLORS,
} from '@/lib/financial/constants'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type TransactionStatus = 'pending' | 'confirmed' | 'cancelled'

interface FinancialTransaction {
  id: string
  org_id: string
  type: 'revenue' | 'expense' | 'commission'
  category: string
  amount: number
  currency: string
  description: string | null
  lead_id: string | null
  broker_id: string | null
  status: TransactionStatus
  transaction_date: string
  reference_month: string
  created_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

type Lang = 'pt' | 'en' | 'es'

interface Props {
  orgId: string
  currency: string
  lang: Lang
  startDate: Date
  endDate: Date
  onUpdate: () => void
}

/* ------------------------------------------------------------------ */
/*  Translations                                                       */
/* ------------------------------------------------------------------ */

const T = {
  pt: {
    title: 'Despesas',
    addExpense: 'Adicionar Despesa',
    all: 'Todas',
    date: 'Data',
    category: 'Categoria',
    description: 'Descrição',
    amount: 'Valor',
    status: 'Status',
    actions: 'Ações',
    save: 'Salvar',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Excluir',
    confirmDelete: 'Tem certeza que deseja excluir esta despesa?',
    notes: 'Observações',
    dayOfMonth: 'Dia do mês',
    loading: 'Carregando...',
    empty: 'Nenhuma despesa encontrada no período.',
    newExpense: 'Nova Despesa',
    editExpense: 'Editar Despesa',
    descriptionPlaceholder: 'Ex: Aluguel do escritório',
    notesPlaceholder: 'Notas opcionais...',
    locale: 'pt-BR',
    pending: 'Pendente',
    confirmed: 'Confirmado',
    cancelled: 'Cancelado',
  },
  en: {
    title: 'Expenses',
    addExpense: 'Add Expense',
    all: 'All',
    date: 'Date',
    category: 'Category',
    description: 'Description',
    amount: 'Amount',
    status: 'Status',
    actions: 'Actions',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    confirmDelete: 'Are you sure you want to delete this expense?',
    notes: 'Notes',
    dayOfMonth: 'Day of month',
    loading: 'Loading...',
    empty: 'No expenses found for this period.',
    newExpense: 'New Expense',
    editExpense: 'Edit Expense',
    descriptionPlaceholder: 'E.g. Office rent',
    notesPlaceholder: 'Optional notes...',
    locale: 'en-US',
    pending: 'Pending',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
  },
  es: {
    title: 'Gastos',
    addExpense: 'Agregar Gasto',
    all: 'Todos',
    date: 'Fecha',
    category: 'Categoría',
    description: 'Descripción',
    amount: 'Monto',
    status: 'Estado',
    actions: 'Acciones',
    save: 'Guardar',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Eliminar',
    confirmDelete: '¿Estás seguro de que deseas eliminar este gasto?',
    notes: 'Notas',
    dayOfMonth: 'Día del mes',
    loading: 'Cargando...',
    empty: 'No se encontraron gastos en el período.',
    newExpense: 'Nuevo Gasto',
    editExpense: 'Editar Gasto',
    descriptionPlaceholder: 'Ej: Alquiler de oficina',
    notesPlaceholder: 'Notas opcionales...',
    locale: 'es-ES',
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    cancelled: 'Cancelado',
  },
} as const

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function getCategoryMeta(key: string) {
  return EXPENSE_CATEGORIES.find((c) => c.key === key)
}

function referenceMonth(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ExpensesPanel({
  orgId,
  currency,
  lang,
  startDate,
  endDate,
  onUpdate,
}: Props) {
  const { user } = useAuth()
  const t = T[lang]

  const [expenses, setExpenses] = useState<FinancialTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<FinancialTransaction | null>(null)

  /* Form state */
  const [formCategory, setFormCategory] = useState(EXPENSE_CATEGORIES[0]?.key ?? '')
  const [formDescription, setFormDescription] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formDate, setFormDate] = useState(toDateStr(new Date()))
  const [formNotes, setFormNotes] = useState('')
  const [saving, setSaving] = useState(false)

  /* ---- fetch ---- */
  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('org_id', orgId)
      .eq('type', 'expense')
      .gte('transaction_date', toDateStr(startDate))
      .lte('transaction_date', toDateStr(endDate))
      .order('transaction_date', { ascending: false })

    setExpenses((data as FinancialTransaction[]) ?? [])
    setLoading(false)
  }, [orgId, startDate, endDate])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  /* ---- filtered list ---- */
  const filtered = filter ? expenses.filter((e) => e.category === filter) : expenses

  /* ---- modal helpers ---- */
  function openAdd() {
    setEditing(null)
    setFormCategory(EXPENSE_CATEGORIES[0]?.key ?? '')
    setFormDescription('')
    setFormAmount('')
    setFormDate(toDateStr(new Date()))
    setFormNotes('')
    setShowModal(true)
  }

  function openEdit(tx: FinancialTransaction) {
    setEditing(tx)
    setFormCategory(tx.category)
    setFormDescription(tx.description ?? '')
    setFormAmount(String(tx.amount))
    setFormDate(tx.transaction_date.slice(0, 10))
    setFormNotes(tx.notes ?? '')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditing(null)
  }

  /* ---- save ---- */
  async function handleSave() {
    if (!formCategory || !formAmount || !formDate) return
    setSaving(true)

    const body = {
      org_id: orgId,
      type: 'expense' as const,
      category: formCategory,
      description: formDescription || null,
      amount: parseFloat(formAmount),
      currency,
      transaction_date: formDate,
      reference_month: referenceMonth(formDate),
      notes: formNotes || null,
      created_by: user?.id ?? null,
    }

    if (editing) {
      await fetch('/api/financial/transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing.id, ...body }),
      })
    } else {
      await fetch('/api/financial/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }

    setSaving(false)
    closeModal()
    await fetchExpenses()
    onUpdate()
  }

  /* ---- delete ---- */
  async function handleDelete(id: string) {
    if (!window.confirm(t.confirmDelete)) return
    await supabase.from('financial_transactions').delete().eq('id', id)
    await fetchExpenses()
    onUpdate()
  }

  /* ---- status label ---- */
  function statusLabel(s: TransactionStatus) {
    return t[s] ?? s
  }

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 16,
        padding: 24,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}
        >
          {t.title}
        </h3>
        <button
          onClick={openAdd}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          {t.addExpense}
        </button>
      </div>

      {/* Category filter chips */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 16,
        }}
      >
        <button
          onClick={() => setFilter(null)}
          style={{
            padding: '4px 12px',
            borderRadius: 20,
            border: '1px solid var(--color-border)',
            background: filter === null ? 'var(--color-primary)' : 'transparent',
            color: filter === null ? '#fff' : 'var(--color-text-secondary)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {t.all}
        </button>
        {EXPENSE_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key === filter ? null : cat.key)}
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              border: '1px solid var(--color-border)',
              background: filter === cat.key ? 'var(--color-primary)' : 'transparent',
              color: filter === cat.key ? '#fff' : 'var(--color-text-secondary)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {cat.icon} {CATEGORY_LABELS[lang]?.[cat.key] ?? cat.key}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 48,
                borderRadius: 8,
                background: 'var(--color-bg-hover)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <p
          style={{
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            padding: '32px 0',
            fontSize: 14,
          }}
        >
          {t.empty}
        </p>
      )}

      {/* Table */}
      {!loading && filtered.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  color: 'var(--color-text-muted)',
                  fontSize: 12,
                  textAlign: 'left',
                }}
              >
                <th style={{ padding: '8px 12px', fontWeight: 500 }}>{t.date}</th>
                <th style={{ padding: '8px 12px', fontWeight: 500 }}>{t.category}</th>
                <th style={{ padding: '8px 12px', fontWeight: 500 }}>{t.description}</th>
                <th style={{ padding: '8px 12px', fontWeight: 500, textAlign: 'right' }}>
                  {t.amount}
                </th>
                <th style={{ padding: '8px 12px', fontWeight: 500 }}>{t.status}</th>
                <th style={{ padding: '8px 12px', fontWeight: 500 }}>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => {
                const cat = getCategoryMeta(tx.category)
                const statusColors = TRANSACTION_STATUS_COLORS[tx.status as TransactionStatus]
                return (
                  <tr
                    key={tx.id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>
                      {new Date(tx.transaction_date).toLocaleDateString(t.locale)}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-primary)' }}>
                      <span style={{ marginRight: 6 }}>{cat?.icon ?? '📁'}</span>
                      {CATEGORY_LABELS[lang]?.[tx.category] ?? tx.category}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>
                      {tx.description || '—'}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {formatPrice(tx.amount, tx.currency)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 500,
                          background: statusColors?.bg ?? 'var(--color-bg-hover)',
                          color: statusColors?.text ?? 'var(--color-text-muted)',
                          border: `1px solid ${statusColors?.border ?? 'var(--color-border)'}`,
                        }}
                      >
                        {statusLabel(tx.status as TransactionStatus)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          title={t.edit}
                          onClick={() => openEdit(tx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 15,
                            padding: 4,
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          title={t.delete}
                          onClick={() => handleDelete(tx.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 15,
                            padding: 4,
                            color: 'var(--color-error)',
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ---- Modal ---- */}
      {showModal && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 16,
              padding: 24,
              maxWidth: 480,
              width: '90%',
            }}
          >
            <h4
              style={{
                margin: '0 0 20px',
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
              }}
            >
              {editing ? t.editExpense : t.newExpense}
            </h4>

            {/* Category */}
            <label style={labelStyle}>{t.category}</label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              style={inputStyle}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.icon} {CATEGORY_LABELS[lang]?.[c.key] ?? c.key}
                </option>
              ))}
            </select>

            {/* Description */}
            <label style={labelStyle}>{t.description}</label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder={t.descriptionPlaceholder}
              style={inputStyle}
            />

            {/* Amount */}
            <label style={labelStyle}>{t.amount}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              style={inputStyle}
            />

            {/* Date */}
            <label style={labelStyle}>{t.date}</label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              style={inputStyle}
            />

            {/* Notes */}
            <label style={labelStyle}>{t.notes}</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder={t.notesPlaceholder}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />

            {/* Buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                marginTop: 20,
              }}
            >
              <button onClick={closeModal} style={secondaryBtnStyle}>
                {t.cancel}
              </button>
              <button onClick={handleSave} disabled={saving} style={primaryBtnStyle}>
                {saving ? '...' : t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Shared inline styles                                               */
/* ------------------------------------------------------------------ */

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--color-text-muted)',
  marginBottom: 4,
  marginTop: 12,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-elevated)',
  color: 'var(--color-text-primary)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 20px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--color-primary)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
}

const secondaryBtnStyle: React.CSSProperties = {
  padding: '8px 20px',
  borderRadius: 8,
  border: '1px solid var(--color-border)',
  background: 'transparent',
  color: 'var(--color-text-secondary)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
}
