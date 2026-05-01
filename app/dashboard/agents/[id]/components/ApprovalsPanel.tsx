// app/dashboard/agents/[id]/components/ApprovalsPanel.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Painel de aprovação no perfil do colaborador IA.
//
// Duas configurações:
//   1. APPROVER — quem pode aprovar ações deste agente (default: qualquer admin).
//      Admin escolhe um user específico (ex: gerente de vendas) que vira o
//      responsável por aprovar/rejeitar ações deste agente.
//
//   2. OVERRIDES — toggle por capability: 'auto' (executa direto) ou 'pending'
//      (espera aprovação humana). Sobrescreve o default da capability no catálogo.
//      Ex: send_whatsapp default é 'pending'; admin pode liberar 'auto' depois
//      de confiança estabelecida com o colaborador IA.
// ═══════════════════════════════════════════════════════════════════════════════

'use client'

import { useState, useEffect } from 'react'
import {
  Loader2, Save, Check, AlertTriangle, ShieldCheck, ShieldAlert, User,
  Mail, MessageSquare, Phone, Search, Cpu, Users,
} from 'lucide-react'
import { capabilitiesForAgent, type CapabilityDefinition } from '@/lib/agents/capabilities'

interface OrgUser {
  id: string
  full_name: string | null
  email: string
  role: string
}

interface AgentConfig {
  approver_user_id?: string | null
  approval_overrides?: Record<string, 'auto' | 'pending'>
}

interface Props {
  agentId: string
  agentSlug: string
}

export default function ApprovalsPanel({ agentId, agentSlug }: Props) {
  const [config, setConfig] = useState<AgentConfig>({})
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const capabilities = capabilitiesForAgent(agentSlug)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch(`/api/agents/${agentId}/config`).then((r) => (r.ok ? r.json() : Promise.reject(r))),
      fetch(`/api/agents/${agentId}/org-users`).then((r) => (r.ok ? r.json() : { users: [] })),
    ])
      .then(([cfgJson, usersJson]) => {
        if (cancelled) return
        setConfig(cfgJson.agent?.config || {})
        setOrgUsers(usersJson.users || [])
      })
      .catch(() => setError('Falha ao carregar config'))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [agentId])

  function setApprover(userId: string | null) {
    setConfig((prev) => ({ ...prev, approver_user_id: userId }))
  }

  function setOverride(slug: string, mode: 'auto' | 'pending') {
    setConfig((prev) => {
      const overrides = { ...(prev.approval_overrides || {}) }
      overrides[slug] = mode
      return { ...prev, approval_overrides: overrides }
    })
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/agents/${agentId}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            approver_user_id: config.approver_user_id || null,
            approval_overrides: config.approval_overrides || {},
          },
        }),
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

  if (loading) {
    return (
      <div className="rounded-xl p-6 flex items-center justify-center"
           style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    )
  }

  const overrides = config.approval_overrides || {}

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
             style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
          <ShieldCheck size={14} />
        </div>
        <h3 className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Aprovação humana
        </h3>
      </div>

      {error && (
        <div className="rounded-lg px-3 py-2 text-xs flex items-center gap-2"
             style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#ef4444' }}>
          <AlertTriangle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}

      {/* APPROVER — quem pode aprovar */}
      <div className="rounded-xl p-4"
           style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Users size={14} style={{ color: 'var(--color-text-secondary)' }} />
          <h4 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
            Aprovador responsável
          </h4>
        </div>
        <p className="text-[11px] mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
          Escolha um colaborador humano que será notificado e poderá aprovar ações deste
          colaborador IA. Se vazio, qualquer admin da org pode aprovar.
        </p>
        <select
          value={config.approver_user_id || ''}
          onChange={(e) => setApprover(e.target.value || null)}
          className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        >
          <option value="">— Qualquer admin —</option>
          {orgUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name || u.email}
              {u.role !== 'admin' ? ` (${u.role})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* OVERRIDES — auto/pending por capability */}
      <div className="rounded-xl p-4"
           style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert size={14} style={{ color: 'var(--color-text-secondary)' }} />
          <h4 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
            Modo de aprovação por ação
          </h4>
        </div>
        <p className="text-[11px] mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
          <strong>Automático</strong>: o colaborador IA executa direto após gates de plano e estado.
          {' '}
          <strong>Supervisão</strong>: cada ação fica pendente esperando aprovação humana.
          O default vem do catálogo; aqui você pode sobrescrever por ação.
        </p>

        <div className="space-y-2">
          {capabilities.map((cap) => {
            const currentMode = overrides[cap.slug] || cap.default_approval
            return (
              <div
                key={cap.slug}
                className="flex items-center justify-between gap-3 p-2.5 rounded-lg"
                style={{ background: 'var(--color-bg-elevated)' }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span style={{ color: getCapabilityColor(cap) }}>
                    {getCapabilityIcon(cap)}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {capabilityLabel(cap.slug)}
                    </div>
                    <div className="text-[10px] truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                      {cap.kind === 'agent' ? '🧠 IA · gasta tokens' : '⚙ worker · determinístico'}
                      {' · '}
                      {cap.default_approval === 'pending' ? 'default: supervisão' : 'default: automático'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setOverride(cap.slug, 'auto')}
                    className="text-[10px] font-bold px-2 py-1 rounded"
                    style={{
                      background: currentMode === 'auto' ? 'rgba(16,185,129,0.15)' : 'transparent',
                      color: currentMode === 'auto' ? '#10b981' : 'var(--color-text-tertiary)',
                      border: '1px solid ' + (currentMode === 'auto' ? 'rgba(16,185,129,0.35)' : 'var(--color-border)'),
                    }}
                  >
                    Automático
                  </button>
                  <button
                    onClick={() => setOverride(cap.slug, 'pending')}
                    className="text-[10px] font-bold px-2 py-1 rounded"
                    style={{
                      background: currentMode === 'pending' ? 'rgba(245,158,11,0.15)' : 'transparent',
                      color: currentMode === 'pending' ? '#f59e0b' : 'var(--color-text-tertiary)',
                      border: '1px solid ' + (currentMode === 'pending' ? 'rgba(245,158,11,0.35)' : 'var(--color-border)'),
                    }}
                  >
                    Supervisão
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Salvar */}
      <div className="flex items-center justify-end pt-1">
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
          {saved ? 'Salvo!' : 'Salvar aprovações'}
        </button>
      </div>
    </div>
  )
}

function getCapabilityIcon(cap: CapabilityDefinition) {
  if (cap.slug.includes('email')) return <Mail size={14} />
  if (cap.slug.includes('whatsapp')) return <Phone size={14} />
  if (cap.slug.includes('reply') || cap.slug.includes('classify')) return <MessageSquare size={14} />
  if (cap.slug.includes('capture') || cap.slug.includes('scrape')) return <Search size={14} />
  return <Cpu size={14} />
}

function getCapabilityColor(cap: CapabilityDefinition): string {
  return cap.kind === 'agent' ? 'var(--color-primary)' : 'var(--color-text-secondary)'
}

function capabilityLabel(slug: string): string {
  const map: Record<string, string> = {
    send_email: 'Enviar email',
    send_whatsapp: 'Enviar WhatsApp',
    generate_reply: 'Gerar resposta',
    classify_intent: 'Classificar intenção',
    move_pipeline_stage: 'Mover no pipeline',
    create_lead: 'Criar lead',
    update_lead: 'Atualizar lead',
    schedule_visit: 'Agendar visita',
    create_task: 'Criar tarefa',
    capture_leads_serper: 'Capturar leads',
    scrape_contact_from_website: 'Scrape de contato',
    generate_email_template: 'Gerar template',
  }
  return map[slug] || slug
}
