'use client'

import { useState, useEffect } from 'react'
import {
  DollarSign, Handshake, UserPlus, Clock, RefreshCw,
  CalendarDays, TrendingUp, Megaphone, Target, Check, Loader2, Power, Pencil, X
} from 'lucide-react'
import { GOAL_COLORS, MANUAL_TEMPLATES } from '@/lib/goals/constants'
import type { GoalTemplate, OrgGoal } from '@/lib/goals/types'
import { FeatureLock } from '@/app/dashboard/components/FeatureLock'
import { formatPrice } from '@/lib/format'

// ═══════════════════════════════════════════════════════════════════════════════
// ICON MAP
// ═══════════════════════════════════════════════════════════════════════════════

const ICON_MAP: Record<string, React.ElementType> = {
  DollarSign, Handshake, UserPlus, Clock, RefreshCw,
  CalendarDays, TrendingUp, Megaphone, Target,
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    title: 'Configurar Metas',
    subtitle: 'Ative metas e defina os alvos para o mês',
    target: 'Alvo',
    activate: 'Ativar Meta',
    active: 'Ativa',
    deactivate: 'Desativar',
    save: 'Salvar',
    editing: 'Editando',
    autoTracked: 'Auto-tracking',
    manual: 'Manual',
    placeholder: 'Valor alvo',
    custom: 'Meta personalizada',
    customName: 'Nome da meta',
    customDesc: 'Descrição',
    currentTarget: 'Alvo atual',
    confirmDeactivate: 'Desativar esta meta?',
    yes: 'Sim',
    no: 'Não',
    edit: 'Editar alvo',
  },
  en: {
    title: 'Configure Goals',
    subtitle: 'Activate goals and set targets for the month',
    target: 'Target',
    activate: 'Activate Goal',
    active: 'Active',
    deactivate: 'Deactivate',
    save: 'Save',
    editing: 'Editing',
    autoTracked: 'Auto-tracked',
    manual: 'Manual',
    placeholder: 'Target value',
    custom: 'Custom goal',
    customName: 'Goal name',
    customDesc: 'Description',
    currentTarget: 'Current target',
    confirmDeactivate: 'Deactivate this goal?',
    yes: 'Yes',
    no: 'No',
    edit: 'Edit target',
  },
  es: {
    title: 'Configurar Metas',
    subtitle: 'Active metas y defina los objetivos para el mes',
    target: 'Objetivo',
    activate: 'Activar Meta',
    active: 'Activa',
    deactivate: 'Desactivar',
    save: 'Guardar',
    editing: 'Editando',
    autoTracked: 'Auto-seguimiento',
    manual: 'Manual',
    placeholder: 'Valor objetivo',
    custom: 'Meta personalizada',
    customName: 'Nombre de la meta',
    customDesc: 'Descripción',
    currentTarget: 'Objetivo actual',
    confirmDeactivate: '¿Desactivar esta meta?',
    yes: 'Sí',
    no: 'No',
    edit: 'Editar objetivo',
  },
}

type Lang = keyof typeof TRANSLATIONS

// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT HELPER
// ═══════════════════════════════════════════════════════════════════════════════

function formatTargetDisplay(value: number, unit: string, currency?: string): string {
  if (unit === 'currency') return formatPrice(value, currency || 'BRL', 'pt-BR')
  if (unit === 'percentage') return `${value}%`
  if (unit === 'minutes') return `${value}min`
  return value.toLocaleString('pt-BR')
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface Props {
  templates: GoalTemplate[]
  activeGoals: OrgGoal[]
  orgId: string
  month: string
  lang?: Lang
  currency?: string
  onGoalActivated: () => void
}

export default function GoalSetup({ templates, activeGoals, orgId, month, lang = 'pt', currency = 'BRL', onGoalActivated }: Props) {
  const t = TRANSLATIONS[lang]

  const [targets, setTargets] = useState<Record<string, string>>({})
  const [customName, setCustomName] = useState('')
  const [activating, setActivating] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null)

  // Map active goals by template_id
  const activeGoalMap = new Map(activeGoals.map(g => [g.template_id, g]))

  // Pre-fill defaults for inactive, and current target for active
  useEffect(() => {
    const vals: Record<string, string> = {}
    templates.forEach(tpl => {
      const active = activeGoalMap.get(tpl.id)
      if (active) {
        vals[tpl.id] = String(active.target_value)
      } else if (tpl.default_target) {
        vals[tpl.id] = String(tpl.default_target)
      }
    })
    setTargets(vals)
  }, [templates, activeGoals])

  const handleActivate = async (templateId: string) => {
    const target = Number(targets[templateId])
    if (!target || target <= 0) return

    setActivating(templateId)
    try {
      const body: Record<string, unknown> = {
        org_id: orgId,
        template_id: templateId,
        period_start: month,
        target_value: target,
      }

      if (templateId === 'custom' && customName) {
        body.custom_name = customName
      }

      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setEditingId(null)
        onGoalActivated()
      }
    } catch (err) {
      console.error('Failed to activate goal:', err)
    } finally {
      setActivating(null)
    }
  }

  const handleDeactivate = async (goalId: string) => {
    setActivating(goalId)
    try {
      const res = await fetch(`/api/goals?id=${goalId}`, { method: 'DELETE' })
      if (res.ok) {
        setConfirmDeactivate(null)
        onGoalActivated()
      }
    } catch (err) {
      console.error('Failed to deactivate goal:', err)
    } finally {
      setActivating(null)
    }
  }

  const langKey = `name_${lang}` as 'name_pt' | 'name_en' | 'name_es'
  const descKey = `description_${lang}` as 'description_pt' | 'description_en' | 'description_es'

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.title}</h2>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {templates
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((template) => {
            const activeGoal = activeGoalMap.get(template.id)
            const isActive = !!activeGoal
            const isCustom = template.id === 'custom'
            const color = GOAL_COLORS[template.id] || '#6b7280'
            const isManual = MANUAL_TEMPLATES.includes(template.id)
            const iconName = template.icon || 'Target'
            const IconComponent = ICON_MAP[iconName] || Target
            const name = template[langKey] || template.name_pt
            const description = template[descKey] || template.description_pt
            const isEditing = editingId === template.id
            const isConfirmingDeactivate = confirmDeactivate === template.id

            const card = (
              <div
                key={template.id}
                className="rounded-xl p-4 transition-all"
                style={{
                  background: isActive ? `${color}08` : 'var(--color-bg-surface)',
                  border: isActive ? `1px solid ${color}40` : '1px solid var(--color-border)',
                }}
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${color}18`, border: `1px solid ${color}30` }}
                  >
                    <IconComponent size={16} style={{ color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {name}
                    </h3>
                    <span
                      className="text-[10px] font-medium uppercase tracking-wide"
                      style={{ color: isManual ? 'var(--color-text-muted)' : color }}
                    >
                      {isManual ? t.manual : t.autoTracked}
                    </span>
                  </div>
                  {isActive && (
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
                    >
                      {t.active}
                    </span>
                  )}
                </div>

                {/* Description */}
                {description && !isActive && (
                  <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                    {description}
                  </p>
                )}

                {/* ─── ACTIVE GOAL: show target + edit/deactivate ─── */}
                {isActive && !isEditing && !isConfirmingDeactivate && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                          {t.currentTarget}
                        </p>
                        <p className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                          {formatTargetDisplay(activeGoal!.target_value, template.unit, currency)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingId(template.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all"
                        style={{
                          color: 'var(--color-text-secondary)',
                          background: 'var(--color-bg-elevated)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <Pencil size={12} />
                        {t.edit}
                      </button>
                      <button
                        onClick={() => setConfirmDeactivate(template.id)}
                        className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all"
                        style={{
                          color: 'var(--color-error)',
                          background: 'var(--color-error-subtle)',
                          border: '1px solid rgba(239, 68, 68, 0.15)',
                        }}
                      >
                        <Power size={12} />
                        {t.deactivate}
                      </button>
                    </div>
                  </div>
                )}

                {/* ─── CONFIRM DEACTIVATE ─── */}
                {isActive && isConfirmingDeactivate && (
                  <div>
                    <p className="text-xs font-medium mb-3" style={{ color: 'var(--color-error)' }}>
                      {t.confirmDeactivate}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeactivate(activeGoal!.id)}
                        disabled={activating === activeGoal!.id}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all disabled:opacity-50"
                        style={{
                          background: 'var(--color-error)',
                          color: '#fff',
                        }}
                      >
                        {activating === activeGoal!.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          t.yes
                        )}
                      </button>
                      <button
                        onClick={() => setConfirmDeactivate(null)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all"
                        style={{
                          color: 'var(--color-text-secondary)',
                          background: 'var(--color-bg-elevated)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        {t.no}
                      </button>
                    </div>
                  </div>
                )}

                {/* ─── EDITING ACTIVE GOAL ─── */}
                {isActive && isEditing && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color }}>
                      {t.editing}
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={targets[template.id] || ''}
                        onChange={e => setTargets(prev => ({ ...prev, [template.id]: e.target.value }))}
                        className="flex-1 rounded-lg px-3 py-2 text-sm outline-none min-w-0 font-medium"
                        style={{
                          background: 'var(--color-bg-base)',
                          border: `1px solid ${color}50`,
                          color: 'var(--color-text-primary)',
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleActivate(template.id)}
                        disabled={activating === template.id || !targets[template.id]}
                        className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5"
                        style={{ background: color, color: '#fff' }}
                      >
                        {activating === template.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <>
                            <Check size={12} />
                            {t.save}
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null)
                          // Reset to original value
                          if (activeGoal) {
                            setTargets(prev => ({ ...prev, [template.id]: String(activeGoal.target_value) }))
                          }
                        }}
                        className="shrink-0 p-2 rounded-lg transition-all"
                        style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-elevated)' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* ─── INACTIVE: custom name + target input + activate button ─── */}
                {!isActive && (
                  <div>
                    {/* Custom name input */}
                    {isCustom && (
                      <input
                        type="text"
                        placeholder={t.customName}
                        value={customName}
                        onChange={e => setCustomName(e.target.value)}
                        className="w-full rounded-lg px-3 py-1.5 text-sm mb-2 outline-none"
                        style={{
                          background: 'var(--color-bg-base)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text-primary)',
                        }}
                      />
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder={t.placeholder}
                        value={targets[template.id] || ''}
                        onChange={e => setTargets(prev => ({ ...prev, [template.id]: e.target.value }))}
                        className="flex-1 rounded-lg px-3 py-2 text-sm outline-none min-w-0"
                        style={{
                          background: 'var(--color-bg-base)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text-primary)',
                        }}
                      />
                      <button
                        onClick={() => handleActivate(template.id)}
                        disabled={activating === template.id || !targets[template.id]}
                        className="shrink-0 rounded-lg px-4 py-2 text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5"
                        style={{
                          background: color,
                          color: '#fff',
                        }}
                      >
                        {activating === template.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          t.activate
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )

            // Custom goal requires Diamond+
            if (isCustom) {
              return (
                <FeatureLock key={template.id} feature="hasAdvancedFinancial" lang={lang} variant="badge">
                  {card}
                </FeatureLock>
              )
            }

            return <div key={template.id}>{card}</div>
          })}
      </div>
    </div>
  )
}
