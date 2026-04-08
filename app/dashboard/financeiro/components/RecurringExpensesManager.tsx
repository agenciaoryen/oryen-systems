'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/format'
import { useAuth } from '@/lib/AuthContext'
import { EXPENSE_CATEGORIES, CATEGORY_LABELS } from '@/lib/financial/constants'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RecurringExpense {
  id: string
  org_id: string
  category: string
  description: string
  amount: number
  currency: string
  day_of_month: number
  is_active: boolean
  last_generated_month: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

type Lang = 'pt' | 'en' | 'es'

interface Props {
  orgId: string
  currency: string
  lang: Lang
}

/* ------------------------------------------------------------------ */
/*  Translations                                                       */
/* ------------------------------------------------------------------ */

const T = {
  pt: {
    title: 'Despesas Recorrentes',
    add: 'Adicionar',
    category: 'Categoria',
    description: 'Descrição',
    amount: 'Valor',
    dayOfMonth: 'Dia do mês',
    save: 'Salvar',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Excluir',
    confirmDelete: 'Tem certeza que deseja excluir esta despesa recorrente?',
    active: 'Ativo',
    inactive: 'Inativo',
    everyDay: 'Todo dia',
    loading: 'Carregando...',
    empty: 'Nenhuma despesa recorrente configurada.',
    newRecurring: 'Nova Despesa Recorrente',
    editRecurring: 'Editar Despesa Recorrente',
    descriptionPlaceholder: 'Ex: Aluguel mensal',
  },
  en: {
    title: 'Recurring Expenses',
    add: 'Add',
    category: 'Category',
    description: 'Description',
    amount: 'Amount',
    dayOfMonth: 'Day of month',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    confirmDelete: 'Are you sure you want to delete this recurring expense?',
    active: 'Active',
    inactive: 'Inactive',
    everyDay: 'Every day',
    loading: 'Loading...',
    empty: 'No recurring expenses configured.',
    newRecurring: 'New Recurring Expense',
    editRecurring: 'Edit Recurring Expense',
    descriptionPlaceholder: 'E.g. Monthly rent',
  },
  es: {
    title: 'Gastos Recurrentes',
    add: 'Agregar',
    category: 'Categoría',
    description: 'Descripción',
    amount: 'Monto',
    dayOfMonth: 'Día del mes',
    save: 'Guardar',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Eliminar',
    confirmDelete: '¿Estás seguro de que deseas eliminar este gasto recurrente?',
    active: 'Activo',
    inactive: 'Inactivo',
    everyDay: 'Cada día',
    loading: 'Cargando...',
    empty: 'No hay gastos recurrentes configurados.',
    newRecurring: 'Nuevo Gasto Recurrente',
    editRecurring: 'Editar Gasto Recurrente',
    descriptionPlaceholder: 'Ej: Alquiler mensual',
  },
} as const

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getCategoryMeta(key: string) {
  return EXPENSE_CATEGORIES.find((c) => c.key === key)
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function RecurringExpensesManager({ orgId, currency, lang }: Props) {
  const { user } = useAuth()
  const t = T[lang]

  const [items, setItems] = useState<RecurringExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<RecurringExpense | null>(null)

  /* Form state */
  const [formCategory, setFormCategory] = useState(EXPENSE_CATEGORIES[0]?.key ?? '')
  const [formDescription, setFormDescription] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formDay, setFormDay] = useState('1')
  const [saving, setSaving] = useState(false)

  /* ---- fetch ---- */
  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('recurring_expenses')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    setItems((data as RecurringExpense[]) ?? [])
    setLoading(false)
  }, [orgId])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  /* ---- modal helpers ---- */
  function openAdd() {
    setEditing(null)
    setFormCategory(EXPENSE_CATEGORIES[0]?.key ?? '')
    setFormDescription('')
    setFormAmount('')
    setFormDay('1')
    setShowModal(true)
  }

  function openEdit(item: RecurringExpense) {
    setEditing(item)
    setFormCategory(item.category)
    setFormDescription(item.description)
    setFormAmount(String(item.amount))
    setFormDay(String(item.day_of_month))
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditing(null)
  }

  /* ---- save ---- */
  async function handleSave() {
    if (!formCategory || !formDescription || !formAmount || !formDay) return
    setSaving(true)

    const body = {
      org_id: orgId,
      category: formCategory,
      description: formDescription,
      amount: parseFloat(formAmount),
      currency,
      day_of_month: parseInt(formDay, 10),
      created_by: user?.id ?? null,
    }

    if (editing) {
      await fetch('/api/financial/recurring', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing.id, ...body }),
      })
    } else {
      await fetch('/api/financial/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }

    setSaving(false)
    closeModal()
    await fetchItems()
  }

  /* ---- toggle active ---- */
  async function handleToggle(item: RecurringExpense) {
    await supabase
      .from('recurring_expenses')
      .update({ is_active: !item.is_active })
      .eq('id', item.id)
    await fetchItems()
  }

  /* ---- delete ---- */
  async function handleDelete(id: string) {
    if (!window.confirm(t.confirmDelete)) return
    await supabase.from('recurring_expenses').delete().eq('id', id)
    await fetchItems()
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
          {t.add}
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 56,
                borderRadius: 10,
                background: 'var(--color-bg-hover)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && (
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

      {/* List */}
      {!loading && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item) => {
            const cat = getCategoryMeta(item.category)
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-elevated)',
                }}
              >
                {/* Icon */}
                <span style={{ fontSize: 20, flexShrink: 0 }}>{cat?.icon ?? '📁'}</span>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {item.description}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--color-text-tertiary)',
                      }}
                    >
                      {CATEGORY_LABELS[lang]?.[item.category] ?? item.category}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      marginTop: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {formatPrice(item.amount, item.currency)}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {t.everyDay} {item.day_of_month}
                    </span>
                  </div>
                </div>

                {/* Active toggle */}
                <button
                  onClick={() => handleToggle(item)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    border: 'none',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: item.is_active ? 'var(--color-success)' : 'var(--color-bg-hover)',
                    color: item.is_active ? '#fff' : 'var(--color-text-muted)',
                    flexShrink: 0,
                  }}
                >
                  {item.is_active ? t.active : t.inactive}
                </button>

                {/* Edit */}
                <button
                  title={t.edit}
                  onClick={() => openEdit(item)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 15,
                    padding: 4,
                    color: 'var(--color-text-muted)',
                    flexShrink: 0,
                  }}
                >
                  ✏️
                </button>

                {/* Delete */}
                <button
                  title={t.delete}
                  onClick={() => handleDelete(item.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 15,
                    padding: 4,
                    color: 'var(--color-error)',
                    flexShrink: 0,
                  }}
                >
                  🗑️
                </button>
              </div>
            )
          })}
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
              {editing ? t.editRecurring : t.newRecurring}
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

            {/* Day of month */}
            <label style={labelStyle}>{t.dayOfMonth}</label>
            <input
              type="number"
              min="1"
              max="28"
              value={formDay}
              onChange={(e) => setFormDay(e.target.value)}
              style={inputStyle}
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
