// /dashboard/agents/inbox
// Inbox de aprovações pendentes — todas as actions onde o colaborador IA
// pediu permissão pro humano antes de executar (ex: send_whatsapp em cold
// outreach, modo supervisão).
//
// Admin pode aprovar (executa o handler) ou rejeitar (marca denied) cada
// item inline. Auto-refresh a cada 10s.

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Inbox, Loader2, Check, X, AlertTriangle, RefreshCw, Mail, MessageSquare,
  Phone, Bot, Clock, ArrowLeft, ShieldAlert,
} from 'lucide-react'

interface PendingAction {
  id: string
  capability: string
  kind: 'worker' | 'agent'
  target_type: string | null
  target_id: string | null
  target_label: string | null
  target_contact: string | null
  triggered_by_type: string
  triggered_by_label: string | null
  started_at: string
  input: any
  agent_id: string
  agent_solution_slug: string | null
}

const REFRESH_MS = 10000

export default function ApprovalInboxPage() {
  const [items, setItems] = useState<PendingAction[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [batchBusy, setBatchBusy] = useState(false)

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch('/api/agents/actions/pending')
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error || 'Erro ao carregar')
      }
      const json = await res.json()
      setItems(json.pending || [])
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchPending, REFRESH_MS)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchPending])

  async function decide(id: string, decision: 'approved' | 'rejected', reason?: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/agents/actions/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Erro')
      // Remove da lista (otimista — vai desaparecer no próximo refresh também)
      setItems((prev) => prev.filter((x) => x.id !== id))
      setSelected((prev) => {
        const n = new Set(prev); n.delete(id); return n
      })
    } catch (e: any) {
      alert(e.message)
    } finally {
      setBusyId(null)
    }
  }

  async function decideBatch(decision: 'approved' | 'rejected') {
    if (selected.size === 0) return
    const reason =
      decision === 'rejected'
        ? prompt(`Motivo de rejeição para ${selected.size} ação(ões) (opcional):`) || undefined
        : undefined
    if (decision === 'approved' &&
        !confirm(`Aprovar e enviar ${selected.size} ação(ões)? Os side-effects (envios, etc) serão executados.`)) {
      return
    }

    setBatchBusy(true)
    const ids = Array.from(selected)
    let okCount = 0
    let failCount = 0

    // Executa em série — algumas capabilities podem demorar (ex: send_email)
    // e queremos que falha numa não impeça as outras.
    for (const id of ids) {
      try {
        const res = await fetch(`/api/agents/actions/${id}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decision, reason }),
        })
        const j = await res.json()
        if (res.ok && (j.ok || decision === 'rejected')) {
          okCount++
        } else {
          failCount++
        }
        // Remove da lista incrementalmente pra UX responsiva
        setItems((prev) => prev.filter((x) => x.id !== id))
      } catch {
        failCount++
      }
    }

    setSelected(new Set())
    setBatchBusy(false)
    alert(`${decision === 'approved' ? 'Aprovadas' : 'Rejeitadas'}: ${okCount}\nFalhas: ${failCount}`)
    fetchPending()
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function toggleSelectAll() {
    if (selected.size === items.length) setSelected(new Set())
    else setSelected(new Set(items.map((i) => i.id)))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <Link
        href="/dashboard/agents"
        className="inline-flex items-center gap-1 text-xs mb-3"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        <ArrowLeft className="w-3 h-3" /> Voltar pra lista de colaboradores
      </Link>

      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{
              background: items.length > 0
                ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                : 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover, #6366f1))',
            }}
          >
            <Inbox className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              Aprovações pendentes
            </h1>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              Ações que os colaboradores IA pediram permissão antes de executar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition"
            style={{
              background: autoRefresh ? 'var(--color-primary-subtle)' : 'var(--color-bg-elevated)',
              border: '1px solid ' + (autoRefresh ? 'var(--color-primary)' : 'var(--color-border)'),
              color: autoRefresh ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto' : 'Manual'}
          </button>
          <button
            onClick={fetchPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition"
            style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Atualizar agora
          </button>
        </div>
      </div>

      {error && (
        <div
          className="mb-4 rounded-lg px-3 py-2 text-sm flex items-center gap-2"
          style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#ef4444' }}
        >
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px dashed var(--color-border)',
            color: 'var(--color-text-tertiary)',
          }}
        >
          <Inbox className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Nenhuma aprovação pendente.</p>
          <p className="text-[11px] mt-1">
            Quando um colaborador IA pedir permissão pra executar uma ação sensível, ela aparece aqui.
          </p>
        </div>
      ) : (
        <>
          {/* Barra de seleção em lote */}
          <div
            className="rounded-lg px-3 py-2 mb-3 flex items-center gap-3 flex-wrap sticky top-0 z-10"
            style={{
              background: selected.size > 0 ? 'var(--color-primary-subtle)' : 'var(--color-bg-elevated)',
              border: '1px solid ' + (selected.size > 0 ? 'var(--color-primary)' : 'var(--color-border)'),
            }}
          >
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.size > 0 && selected.size === items.length}
                ref={(el) => { if (el) el.indeterminate = selected.size > 0 && selected.size < items.length }}
                onChange={toggleSelectAll}
                className="cursor-pointer"
              />
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                {selected.size === 0
                  ? `Selecionar (${items.length})`
                  : `${selected.size} selecionada(s)`}
              </span>
            </label>

            {selected.size > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => decideBatch('rejected')}
                  disabled={batchBusy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                  Rejeitar selecionadas
                </button>
                <button
                  onClick={() => decideBatch('approved')}
                  disabled={batchBusy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                  style={{ background: '#10b981', color: '#fff' }}
                >
                  {batchBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Aprovar e enviar selecionadas
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <PendingRow
                key={item.id}
                item={item}
                busy={busyId === item.id}
                selected={selected.has(item.id)}
                onToggleSelect={() => toggleSelect(item.id)}
                onDecide={decide}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function PendingRow({
  item,
  busy,
  selected,
  onToggleSelect,
  onDecide,
}: {
  item: PendingAction
  busy: boolean
  selected: boolean
  onToggleSelect: () => void
  onDecide: (id: string, decision: 'approved' | 'rejected', reason?: string) => void
}) {
  const Icon = getCapabilityIcon(item.capability)
  const ageMin = Math.round((Date.now() - new Date(item.started_at).getTime()) / 60000)
  const messagePreview = previewMessage(item.capability, item.input)

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid ' + (selected ? 'var(--color-primary)' : 'var(--color-border)'),
      }}
    >
      <div className="p-4 flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="mt-2 cursor-pointer"
        />
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
              {capabilityLabel(item.capability)}
            </span>
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-tertiary)' }}
            >
              <Bot className="w-2.5 h-2.5 inline mr-0.5" />
              {item.agent_solution_slug || 'agente'}
            </span>
            {item.kind === 'agent' && (
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}
              >
                IA
              </span>
            )}
          </div>

          {item.target_label && (
            <div className="text-xs mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Para: <strong>{item.target_label}</strong>
              {item.target_contact && (
                <span className="ml-2 text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                  · {item.target_contact}
                </span>
              )}
            </div>
          )}

          {messagePreview && (
            <div
              className="rounded-md px-2.5 py-1.5 text-[12px] mb-2 mt-1.5"
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {messagePreview}
            </div>
          )}

          <div
            className="text-[10px] flex items-center gap-2 flex-wrap"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <Clock className="w-3 h-3" />
            <span>
              Pedido há {ageMin < 60 ? `${ageMin}min` : `${Math.round(ageMin / 60)}h`}
            </span>
            {item.triggered_by_label && (
              <>
                <span>·</span>
                <span>{item.triggered_by_label}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div
        className="px-4 py-3 flex items-center justify-end gap-2"
        style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)' }}
      >
        <button
          onClick={() => {
            const reason = prompt('Motivo da rejeição (opcional):') || undefined
            onDecide(item.id, 'rejected', reason)
          }}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50"
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
          onMouseEnter={(e) => {
            if (busy) return
            e.currentTarget.style.borderColor = '#ef4444'
            e.currentTarget.style.color = '#ef4444'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)'
            e.currentTarget.style.color = 'var(--color-text-secondary)'
          }}
        >
          <X className="w-3.5 h-3.5" />
          Rejeitar
        </button>
        <button
          onClick={() => onDecide(item.id, 'approved')}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50"
          style={{ background: '#10b981', color: '#fff' }}
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Aprovar e enviar
        </button>
      </div>
    </div>
  )
}

function getCapabilityIcon(capability: string) {
  if (capability.includes('email')) return Mail
  if (capability.includes('whatsapp')) return Phone
  if (capability.includes('reply') || capability.includes('classify')) return MessageSquare
  return ShieldAlert
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
    scrape_contact_from_website: 'Buscar contato no site',
  }
  return map[slug] || slug
}

function previewMessage(capability: string, input: any): string | null {
  if (!input || typeof input !== 'object') return null
  if (capability === 'send_email') {
    const subject = input.subject ? `Assunto: ${input.subject}\n\n` : ''
    const body = input.body || ''
    return (subject + String(body).substring(0, 280) + (String(body).length > 280 ? '…' : '')) || null
  }
  if (capability === 'send_whatsapp') {
    return String(input.body || input.text || '').substring(0, 280) || null
  }
  return null
}
