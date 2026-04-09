'use client'

import { useState, useEffect } from 'react'
import {
  DollarSign, Handshake, UserPlus, Clock, RefreshCw,
  CalendarDays, TrendingUp, Megaphone, Target, Plus, Check, Loader2
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
    title: 'Ativar Metas',
    subtitle: 'Selecione os templates e defina seus alvos para o mes',
    target: 'Alvo',
    activate: 'Ativar',
    activated: 'Ativa',
    autoTracked: 'Auto-tracking',
    manual: 'Manual',
    placeholder: 'Valor alvo',
    custom: 'Meta personalizada',
    customName: 'Nome da meta',
    customDesc: 'Descricao',
  },
  en: {
    title: 'Activate Goals',
    subtitle: 'Select templates and define your targets for the month',
    target: 'Target',
    activate: 'Activate',
    activated: 'Active',
    autoTracked: 'Auto-tracked',
    manual: 'Manual',
    placeholder: 'Target value',
    custom: 'Custom goal',
    customName: 'Goal name',
    customDesc: 'Description',
  },
  es: {
    title: 'Activar Metas',
    subtitle: 'Seleccione plantillas y defina sus objetivos para el mes',
    target: 'Objetivo',
    activate: 'Activar',
    activated: 'Activa',
    autoTracked: 'Auto-seguimiento',
    manual: 'Manual',
    placeholder: 'Valor objetivo',
    custom: 'Meta personalizada',
    customName: 'Nombre de la meta',
    customDesc: 'Descripcion',
  },
}

type Lang = keyof typeof TRANSLATIONS

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface Props {
  templates: GoalTemplate[]
  activeGoals: OrgGoal[]
  orgId: string
  month: string
  lang?: Lang
  onGoalActivated: () => void
}

export default function GoalSetup({ templates, activeGoals, orgId, month, lang = 'pt', onGoalActivated }: Props) {
  const t = TRANSLATIONS[lang]

  const [targets, setTargets] = useState<Record<string, string>>({})
  const [customName, setCustomName] = useState('')
  const [activating, setActivating] = useState<string | null>(null)

  // Active template IDs
  const activeTemplateIds = new Set(activeGoals.map(g => g.template_id))

  // Pre-fill defaults
  useEffect(() => {
    const defaults: Record<string, string> = {}
    templates.forEach(t => {
      if (t.default_target && !activeTemplateIds.has(t.id)) {
        defaults[t.id] = String(t.default_target)
      }
    })
    setTargets(prev => ({ ...defaults, ...prev }))
  }, [templates])

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
        onGoalActivated()
      }
    } catch (err) {
      console.error('Failed to activate goal:', err)
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
            const isActive = activeTemplateIds.has(template.id)
            const isCustom = template.id === 'custom'
            const color = GOAL_COLORS[template.id] || '#6b7280'
            const isManual = MANUAL_TEMPLATES.includes(template.id)
            const iconName = template.icon || 'Target'
            const IconComponent = ICON_MAP[iconName] || Target
            const name = template[langKey] || template.name_pt
            const description = template[descKey] || template.description_pt

            const card = (
              <div
                key={template.id}
                className="rounded-xl p-4 transition-all"
                style={{
                  background: isActive ? `${color}08` : 'var(--color-bg-surface)',
                  border: isActive ? `1px solid ${color}40` : '1px solid var(--color-border)',
                  opacity: isActive ? 0.7 : 1,
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
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: `${color}20` }}
                    >
                      <Check size={14} style={{ color }} />
                    </div>
                  )}
                </div>

                {/* Description */}
                {description && (
                  <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                    {description}
                  </p>
                )}

                {/* Custom name input */}
                {isCustom && !isActive && (
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

                {/* Target input + activate button */}
                {!isActive && (
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
                      className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all disabled:opacity-40"
                      style={{
                        background: color,
                        color: '#fff',
                      }}
                    >
                      {activating === template.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Plus size={14} />
                      )}
                    </button>
                  </div>
                )}

                {isActive && (
                  <p className="text-xs font-medium" style={{ color }}>
                    {t.activated}
                  </p>
                )}
              </div>
            )

            // Custom goal requires Diamond+
            if (isCustom) {
              return (
                <FeatureLock key={template.id} feature="hasAdvancedFinancial" lang={lang} variant="overlay">
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
