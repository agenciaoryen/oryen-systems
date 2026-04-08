'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/format'
import { useAuth } from '@/lib/AuthContext'

interface CommissionRule {
  id: string
  org_id: string
  broker_id: string | null
  name: string
  tiers: { up_to: number | null; rate: number }[]
  agency_split_pct: number
  broker_split_pct: number
  is_active: boolean
  priority: number
  created_at: string
  updated_at: string
}

interface Props {
  orgId: string
  currency: string
  lang: 'pt' | 'en' | 'es'
}

interface BrokerOption {
  id: string
  name: string
}

interface FormData {
  name: string
  broker_id: string | null
  tiers: { up_to: number | null; rate: number }[]
  agency_split_pct: number
}

const translations = {
  pt: {
    title: 'Regras de Comissão',
    addRule: 'Adicionar Regra',
    editRule: 'Editar Regra',
    name: 'Nome',
    broker: 'Corretor',
    defaultAll: 'Padrão para todos',
    tiers: 'Faixas',
    upTo: 'Até',
    rate: 'Taxa',
    unlimited: 'Sem limite',
    addTier: 'Adicionar Faixa',
    removeTier: 'Remover',
    agencySplit: 'Divisão Agência',
    brokerSplit: 'Divisão Corretor',
    split: 'Divisão',
    save: 'Salvar',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Excluir',
    active: 'Ativa',
    inactive: 'Inativa',
    loading: 'Carregando...',
    empty: 'Nenhuma regra cadastrada.',
    confirmDelete: 'Tem certeza que deseja excluir esta regra?',
    default: 'Padrão',
    namePlaceholder: 'Nome da regra',
  },
  en: {
    title: 'Commission Rules',
    addRule: 'Add Rule',
    editRule: 'Edit Rule',
    name: 'Name',
    broker: 'Broker',
    defaultAll: 'Default for all',
    tiers: 'Tiers',
    upTo: 'Up to',
    rate: 'Rate',
    unlimited: 'Unlimited',
    addTier: 'Add Tier',
    removeTier: 'Remove',
    agencySplit: 'Agency Split',
    brokerSplit: 'Broker Split',
    split: 'Split',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    active: 'Active',
    inactive: 'Inactive',
    loading: 'Loading...',
    empty: 'No rules configured.',
    confirmDelete: 'Are you sure you want to delete this rule?',
    default: 'Default',
    namePlaceholder: 'Rule name',
  },
  es: {
    title: 'Reglas de Comisión',
    addRule: 'Agregar Regla',
    editRule: 'Editar Regla',
    name: 'Nombre',
    broker: 'Corredor',
    defaultAll: 'Predeterminado para todos',
    tiers: 'Niveles',
    upTo: 'Hasta',
    rate: 'Tasa',
    unlimited: 'Sin límite',
    addTier: 'Agregar Nivel',
    removeTier: 'Eliminar',
    agencySplit: 'División Agencia',
    brokerSplit: 'División Corredor',
    split: 'División',
    save: 'Guardar',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Eliminar',
    active: 'Activa',
    inactive: 'Inactiva',
    loading: 'Cargando...',
    empty: 'No hay reglas configuradas.',
    confirmDelete: '¿Está seguro de que desea eliminar esta regla?',
    default: 'Predeterminado',
    namePlaceholder: 'Nombre de la regla',
  },
}

const emptyForm: FormData = {
  name: '',
  broker_id: null,
  tiers: [{ up_to: null, rate: 5 }],
  agency_split_pct: 50,
}

export default function CommissionRulesEditor({ orgId, currency, lang }: Props) {
  const t = translations[lang]

  const [rules, setRules] = useState<CommissionRule[]>([])
  const [brokers, setBrokers] = useState<BrokerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormData>({ ...emptyForm })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [rulesRes, usersRes] = await Promise.all([
        supabase
          .from('commission_rules')
          .select('*')
          .eq('org_id', orgId)
          .order('priority', { ascending: true }),
        supabase
          .from('users')
          .select('id, name')
          .eq('org_id', orgId),
      ])

      if (rulesRes.data) setRules(rulesRes.data as CommissionRule[])
      if (usersRes.data) setBrokers(usersRes.data as BrokerOption[])
    } catch (err) {
      console.error('Error fetching commission rules:', err)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getBrokerName = (brokerId: string | null) => {
    if (!brokerId) return t.default
    const broker = brokers.find((b) => b.id === brokerId)
    return broker?.name || brokerId
  }

  const openAddForm = () => {
    setEditingId(null)
    setForm({ ...emptyForm })
    setShowForm(true)
  }

  const openEditForm = (rule: CommissionRule) => {
    setEditingId(rule.id)
    setForm({
      name: rule.name,
      broker_id: rule.broker_id,
      tiers: [...rule.tiers],
      agency_split_pct: rule.agency_split_pct,
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm({ ...emptyForm })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        ...form,
        org_id: orgId,
        broker_split_pct: 100 - form.agency_split_pct,
      }

      if (editingId) {
        await fetch('/api/financial/commission-rules', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...body }),
        })
      } else {
        await fetch('/api/financial/commission-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      closeForm()
      await fetchData()
    } catch (err) {
      console.error('Error saving rule:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t.confirmDelete)) return
    try {
      await fetch(`/api/financial/commission-rules?id=${id}`, { method: 'DELETE' })
      await fetchData()
    } catch (err) {
      console.error('Error deleting rule:', err)
    }
  }

  const handleToggleActive = async (rule: CommissionRule) => {
    try {
      await fetch('/api/financial/commission-rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, is_active: !rule.is_active }),
      })
      await fetchData()
    } catch (err) {
      console.error('Error toggling rule:', err)
    }
  }

  const updateTier = (index: number, field: 'up_to' | 'rate', value: number | null) => {
    const newTiers = [...form.tiers]
    newTiers[index] = { ...newTiers[index], [field]: value }
    setForm({ ...form, tiers: newTiers })
  }

  const addTier = () => {
    const newTiers = [...form.tiers]
    // Make the previous last tier have a value if it was null
    if (newTiers.length > 0 && newTiers[newTiers.length - 1].up_to === null) {
      newTiers[newTiers.length - 1].up_to = 100000
    }
    newTiers.push({ up_to: null, rate: 5 })
    setForm({ ...form, tiers: newTiers })
  }

  const removeTier = (index: number) => {
    if (form.tiers.length <= 1) return
    const newTiers = form.tiers.filter((_, i) => i !== index)
    // Ensure last tier has up_to = null
    newTiers[newTiers.length - 1].up_to = null
    setForm({ ...form, tiers: newTiers })
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 12,
    padding: 20,
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--color-border)',
    background: 'var(--color-bg-elevated)',
    color: 'var(--color-text-primary)',
    fontSize: 14,
    outline: 'none',
  }

  const btnPrimary: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    background: 'var(--color-primary)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
  }

  const btnSecondary: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid var(--color-border)',
    background: 'var(--color-bg-elevated)',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 18, fontWeight: 600 }}>
          {t.title}
        </h3>
        {!showForm && (
          <button onClick={openAddForm} style={btnPrimary}>
            + {t.addRule}
          </button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <div
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <h4 style={{ margin: '0 0 12px', color: 'var(--color-text-primary)', fontSize: 15, fontWeight: 600 }}>
            {editingId ? t.editRule : t.addRule}
          </h4>

          {/* Name */}
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>{t.name}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t.namePlaceholder}
              style={inputStyle}
            />
          </div>

          {/* Broker */}
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>{t.broker}</label>
            <select
              value={form.broker_id || ''}
              onChange={(e) => setForm({ ...form, broker_id: e.target.value || null })}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">{t.defaultAll}</option>
              {brokers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tiers */}
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>{t.tiers}</label>
            {form.tiers.map((tier, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)', minWidth: 40 }}>
                  {t.upTo}
                </span>
                {tier.up_to !== null || i < form.tiers.length - 1 ? (
                  <input
                    type="number"
                    value={tier.up_to ?? ''}
                    onChange={(e) => updateTier(i, 'up_to', e.target.value ? Number(e.target.value) : null)}
                    style={{ ...inputStyle, width: 140 }}
                    placeholder="0"
                  />
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)', width: 140, padding: '8px 12px' }}>
                    {t.unlimited}
                  </span>
                )}
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>→</span>
                <input
                  type="number"
                  value={tier.rate}
                  onChange={(e) => updateTier(i, 'rate', Number(e.target.value))}
                  style={{ ...inputStyle, width: 80 }}
                  step="0.1"
                  min="0"
                  max="100"
                />
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>%</span>
                {form.tiers.length > 1 && (
                  <button
                    onClick={() => removeTier(i)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--color-error)',
                      background: 'transparent',
                      color: 'var(--color-error)',
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    {t.removeTier}
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addTier}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                border: '1px dashed var(--color-border)',
                background: 'transparent',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                fontSize: 12,
                marginTop: 4,
              }}
            >
              + {t.addTier}
            </button>
          </div>

          {/* Agency split */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>
              {t.agencySplit}: {form.agency_split_pct}% / {t.brokerSplit}: {100 - form.agency_split_pct}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={form.agency_split_pct}
              onChange={(e) => setForm({ ...form, agency_split_pct: Number(e.target.value) })}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)' }}>
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} disabled={saving || !form.name.trim()} style={{ ...btnPrimary, opacity: saving || !form.name.trim() ? 0.5 : 1 }}>
              {t.save}
            </button>
            <button onClick={closeForm} style={btnSecondary}>
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Rules list */}
      {loading ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
          {t.loading}
        </div>
      ) : rules.length === 0 && !showForm ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
          {t.empty}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rules.map((rule) => (
            <div
              key={rule.id}
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 10,
                padding: 14,
                opacity: rule.is_active ? 1 : 0.6,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>
                    {rule.name}
                  </span>
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 12,
                      color: 'var(--color-text-tertiary)',
                    }}
                  >
                    {getBrokerName(rule.broker_id)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    onClick={() => handleToggleActive(rule)}
                    style={{
                      padding: '3px 10px',
                      borderRadius: 6,
                      border: `1px solid ${rule.is_active ? 'var(--color-success)' : 'var(--color-border)'}`,
                      background: 'transparent',
                      color: rule.is_active ? 'var(--color-success)' : 'var(--color-text-muted)',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  >
                    {rule.is_active ? t.active : t.inactive}
                  </button>
                  <button
                    onClick={() => openEditForm(rule)}
                    style={{
                      padding: '3px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--color-border)',
                      background: 'transparent',
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    {t.edit}
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    style={{
                      padding: '3px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--color-error)',
                      background: 'transparent',
                      color: 'var(--color-error)',
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    {t.delete}
                  </button>
                </div>
              </div>

              {/* Tiers display */}
              <div style={{ marginBottom: 6 }}>
                {rule.tiers.map((tier, i) => (
                  <span key={i} style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginRight: 12 }}>
                    {tier.up_to !== null
                      ? `${t.upTo} ${formatPrice(tier.up_to, currency)} → ${tier.rate}%`
                      : `${t.unlimited} → ${tier.rate}%`}
                  </span>
                ))}
              </div>

              {/* Split display */}
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                {t.split}: {lang === 'pt' ? 'Agência' : lang === 'es' ? 'Agencia' : 'Agency'} {rule.agency_split_pct}% / {lang === 'pt' ? 'Corretor' : lang === 'es' ? 'Corredor' : 'Broker'} {rule.broker_split_pct}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--color-text-muted)',
  marginBottom: 4,
}
