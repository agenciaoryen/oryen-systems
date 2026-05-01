// app/dashboard/agents/[id]/components/FollowUpConfigPanel.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Painel de configuração do colaborador IA Follow-up.
//
// Exibido no perfil do agente quando solution_slug ∈ {followup, followup_imobiliario}.
// Permite ao admin:
//   - Ligar/desligar auto-detecção de leads silenciosos
//   - Pausar o colaborador (is_paused — equivalente a "férias")
//   - Customizar cadência (5 tentativas com horas configuráveis)
//   - Limitar max tentativas (1..10)
//   - Ajustar horário comercial (start..end)
//   - Definir threshold de silêncio (horas até considerar lead silencioso)
// ═══════════════════════════════════════════════════════════════════════════════

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Loader2, Save, Check, AlertTriangle, Power, PowerOff, Clock, Hash, Inbox,
  Settings,
} from 'lucide-react'

interface AgentConfig {
  auto_detect_enabled?: boolean
  cadence_hours?: number[]
  max_attempts?: number
  business_hours_start?: number
  business_hours_end?: number
  silence_threshold_hours?: number
}

interface Props {
  agentId: string
}

const DEFAULT_CADENCE = [4, 24, 72, 120, 168]

export default function FollowUpConfigPanel({ agentId }: Props) {
  const [config, setConfig] = useState<AgentConfig>({})
  const [isPaused, setIsPaused] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/agents/${agentId}/config`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((j) => {
        if (cancelled) return
        setConfig(j.agent?.config || {})
        setIsPaused(!!j.agent?.is_paused)
      })
      .catch(() => setError('Falha ao carregar config'))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [agentId])

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/agents/${agentId}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, is_paused: isPaused }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Erro ao salvar')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function updateConfig<K extends keyof AgentConfig>(key: K, value: AgentConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  function updateCadence(idx: number, value: number) {
    setConfig((prev) => {
      const cadence = [...(prev.cadence_hours || DEFAULT_CADENCE)]
      cadence[idx] = Math.max(1, Math.min(720, value))
      return { ...prev, cadence_hours: cadence }
    })
  }

  if (loading) {
    return (
      <div className="rounded-xl p-8 flex items-center justify-center"
           style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    )
  }

  const cadence = config.cadence_hours || DEFAULT_CADENCE
  const maxAttempts = Math.min(config.max_attempts ?? 5, cadence.length || 5)
  const businessStart = config.business_hours_start ?? 8
  const businessEnd = config.business_hours_end ?? 20
  const silenceThreshold = config.silence_threshold_hours ?? 4
  const autoDetect = config.auto_detect_enabled !== false

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
            <Settings size={14} />
          </div>
          <h3 className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Configuração do Follow-up
          </h3>
        </div>

        <Link
          href="/dashboard/follow-up"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <Inbox className="w-3.5 h-3.5" />
          Ver fila de follow-ups
        </Link>
      </div>

      {error && (
        <div className="rounded-lg px-3 py-2 text-xs flex items-center gap-2"
             style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#ef4444' }}>
          <AlertTriangle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}

      {/* Toggle pausado / ativo */}
      <Section title="Estado" icon={<Power size={14} />}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="relative w-11 h-6 rounded-full transition"
            style={{ background: isPaused ? 'var(--color-text-tertiary)' : '#10b981' }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
              style={{ left: isPaused ? '2px' : '22px' }}
            />
          </button>
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {isPaused ? 'Pausado' : 'Ativo'}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
              {isPaused
                ? 'Não envia novos follow-ups. Itens na fila são pulados.'
                : 'Trabalhando normalmente — envia conforme cadência abaixo.'}
            </div>
          </div>
        </div>
      </Section>

      {/* Auto-detecção */}
      <Section title="Auto-detecção de leads silenciosos" icon={<PowerOff size={14} />}>
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => updateConfig('auto_detect_enabled', !autoDetect)}
            className="relative w-11 h-6 rounded-full transition"
            style={{ background: autoDetect ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
              style={{ left: autoDetect ? '22px' : '2px' }}
            />
          </button>
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {autoDetect ? 'Ligada' : 'Desligada'}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
              {autoDetect
                ? 'Cron acha automaticamente leads que pararam de responder e os enfileira.'
                : 'Só processa itens já enfileirados manualmente. Não busca novos.'}
            </div>
          </div>
        </div>
        {autoDetect && (
          <NumberRow
            label="Considerar lead silencioso após"
            value={silenceThreshold}
            min={1}
            max={72}
            unit="horas"
            onChange={(v) => updateConfig('silence_threshold_hours', v)}
          />
        )}
      </Section>

      {/* Cadência */}
      <Section title="Cadência das tentativas" icon={<Clock size={14} />}>
        <div className="text-[11px] mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
          Quantas horas após a tentativa anterior cada follow-up deve sair.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {cadence.slice(0, maxAttempts).map((hours, idx) => (
            <div key={idx}>
              <div className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
                {idx + 1}ª tentativa
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={720}
                  value={hours}
                  onChange={(e) => updateCadence(idx, parseInt(e.target.value) || 1)}
                  className="w-full rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                  style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                />
                <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>h</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Max tentativas */}
      <Section title="Limite de tentativas" icon={<Hash size={14} />}>
        <NumberRow
          label="Máximo de tentativas por lead"
          value={maxAttempts}
          min={1}
          max={cadence.length}
          unit="tentativas"
          onChange={(v) => updateConfig('max_attempts', v)}
        />
      </Section>

      {/* Horário comercial */}
      <Section title="Horário de trabalho" icon={<Clock size={14} />}>
        <div className="grid grid-cols-2 gap-3">
          <NumberRow
            label="Início"
            value={businessStart}
            min={0}
            max={23}
            unit="h"
            onChange={(v) => updateConfig('business_hours_start', v)}
          />
          <NumberRow
            label="Fim"
            value={businessEnd}
            min={0}
            max={23}
            unit="h"
            onChange={(v) => updateConfig('business_hours_end', v)}
          />
        </div>
      </Section>

      {/* Salvar */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
          style={{
            background: saved ? 'rgba(16,185,129,0.15)' : 'var(--color-primary)',
            color: saved ? '#10b981' : 'var(--color-text-on-primary, #fff)',
          }}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? 'Salvo!' : 'Salvar configuração'}
        </button>
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4"
         style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: 'var(--color-text-secondary)' }}>{icon}</span>
        <h4 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{title}</h4>
      </div>
      {children}
    </div>
  )
}

function NumberRow({
  label, value, min, max, unit, onChange,
}: {
  label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
          className="w-20 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none"
          style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
        />
        <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{unit}</span>
      </div>
    </div>
  )
}
