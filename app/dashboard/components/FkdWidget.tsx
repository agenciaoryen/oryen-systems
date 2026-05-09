'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Rocket, Heart, CheckCircle2, ArrowRight, Zap } from 'lucide-react'

const T = {
  pt: {
    title: 'Rotina Diária',
    finder: 'Prospecção',
    keeper: 'Relacionamento',
    doer: 'Execução',
    finderDesc: 'Prospecção',
    keeperDesc: 'Relacionamento',
    doerDesc: 'Execução',
    complete: 'Dia completo!',
    completeDesc: '3 papéis concluídos',
    streak: 'dias consecutivos',
    open: 'Abrir rotina',
    loading: 'Carregando...',
    empty: 'Comece seu dia — abra a Rotina Diária.',
  },
  en: {
    title: 'Daily Routine',
    finder: 'Finder',
    keeper: 'Keeper',
    doer: 'Doer',
    finderDesc: 'Prospecting',
    keeperDesc: 'Nurturing',
    doerDesc: 'Execution',
    complete: 'Day complete!',
    completeDesc: 'All 3 roles done',
    streak: 'day streak',
    open: 'Open routine',
    loading: 'Loading...',
    empty: 'Start your day — open Daily Routine.',
  },
  es: {
    title: 'Rutina Diaria',
    finder: 'Prospección',
    keeper: 'Relaciones',
    doer: 'Ejecución',
    finderDesc: 'Prospección',
    keeperDesc: 'Nutrición',
    doerDesc: 'Ejecución',
    complete: '¡Día completo!',
    completeDesc: '3 roles cumplidos',
    streak: 'días seguidos',
    open: 'Abrir rutina',
    loading: 'Cargando...',
    empty: 'Comienza tu día — abre la Rutina Diaria.',
  },
}

interface Props {
  orgId: string
  lang?: 'pt' | 'en' | 'es'
}

interface RoleStatus {
  label: string
  desc: string
  count: number
  total: number
  color: string
  icon: React.ReactNode
}

function Skeleton() {
  return (
    <div className="p-4 sm:p-5 animate-pulse space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ background: 'var(--color-border)' }} />
        <div className="h-4 w-24 rounded" style={{ background: 'var(--color-border)' }} />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-5 h-5 rounded" style={{ background: 'var(--color-border)' }} />
          <div className="h-2 rounded flex-1" style={{ background: 'var(--color-border)' }} />
          <div className="h-2 rounded w-8" style={{ background: 'var(--color-border)' }} />
        </div>
      ))}
    </div>
  )
}

export default function FkdWidget({ orgId, lang = 'pt' }: Props) {
  const [roles, setRoles] = useState<RoleStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const t = T[lang]

  const loadData = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setError(false)

    try {
      const now = new Date()
      const todayStr = now.toISOString().split('T')[0]

      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()

      const [taskRes, followUpRes, noRespRes, hotStaleRes, visitRes, dealRes, docRes] = await Promise.all([
        // Finder: count today's tasks and done
        supabase
          .from('prospection_tasks')
          .select('status')
          .eq('org_id', orgId)
          .lte('due_at', new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString())
          .in('status', ['pending', 'in_progress', 'overdue', 'queued', 'done'])
          .limit(200),

        // Keeper part 1: pending follow-ups
        supabase
          .from('follow_up_queue')
          .select('id')
          .eq('org_id', orgId)
          .in('status', ['pending', 'active'])
          .lte('next_attempt_at', now.toISOString())
          .limit(20),

        // Keeper part 2: no-response leads (last user message 3d+ without response)
        supabase
          .from('sdr_messages')
          .select('lead_id')
          .eq('org_id', orgId)
          .eq('role', 'user')
          .lt('created_at', threeDaysAgo)
          .limit(50),

        // Keeper part 3: hot stale leads (score >= 56, no update 5d+)
        supabase
          .from('leads')
          .select('id')
          .eq('org_id', orgId)
          .gte('score', 56)
          .lt('updated_at', fiveDaysAgo)
          .limit(20),

        // Doer part 1: visits today
        supabase
          .from('calendar_events')
          .select('id')
          .eq('org_id', orgId)
          .eq('event_date', todayStr)
          .eq('status', 'scheduled')
          .limit(20),

        // Doer part 2: deals closing
        supabase
          .from('leads')
          .select('id')
          .eq('org_id', orgId)
          .in('stage', ['proposta', 'negociacao', 'fechamento', 'negotiation', 'proposal', 'closing'])
          .gt('total_em_vendas', 0)
          .limit(20),

        // Doer part 3: pending documents
        supabase
          .from('lead_documents')
          .select('id')
          .eq('org_id', orgId)
          .in('status', ['draft', 'ready', 'sent'])
          .limit(20),
      ])

      const tasks = taskRes.data || []
      const finderPending = tasks.filter((t: any) => t.status !== 'done').length
      const finderDone = tasks.filter((t: any) => t.status === 'done').length
      const finderTotal = finderPending + finderDone

      // Keeper: dedup approximate — unique leads that need attention
      const keeperItems = new Set<string>()
      ;(followUpRes.data || []).forEach((f: any) => keeperItems.add(`f_${f.id}`))
      const noRespLeads = new Set((noRespRes.data || []).map((m: any) => m.lead_id))
      noRespLeads.forEach((id) => keeperItems.add(`nr_${id}`))
      ;(hotStaleRes.data || []).forEach((l: any) => keeperItems.add(`hs_${l.id}`))
      const keeperPending = keeperItems.size

      const doerPending = (visitRes.data || []).length + (dealRes.data || []).length + (docRes.data || []).length

      const newRoles: RoleStatus[] = [
        {
          label: t.finder,
          desc: t.finderDesc,
          count: finderDone,
          total: finderTotal || 1,
          color: '#4F6FFF',
          icon: <Rocket size={14} />,
        },
        {
          label: t.keeper,
          desc: t.keeperDesc,
          count: 0,
          total: keeperPending || 1,
          color: '#EC4899',
          icon: <Heart size={14} />,
        },
        {
          label: t.doer,
          desc: t.doerDesc,
          count: 0,
          total: doerPending || 1,
          color: '#10B981',
          icon: <CheckCircle2 size={14} />,
        },
      ]

      setRoles(newRoles)
    } catch (err) {
      console.error('FkdWidget: load error', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [orgId, t.finder, t.keeper, t.doer, t.finderDesc, t.keeperDesc, t.doerDesc])

  useEffect(() => {
    if (orgId) loadData()
  }, [orgId, loadData])

  if (error) return null

  if (loading) return <Skeleton />

  const allComplete = roles.every((r) => r.total <= 1 && r.count >= r.total)

  return (
    <div
      className="rounded-2xl overflow-hidden p-4 sm:p-5"
      style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap size={15} style={{ color: '#f59e0b' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t.title}
          </h3>
        </div>
        <Link
          href="/dashboard/fkd"
          className="text-[10px] font-medium flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t.open} <ArrowRight size={10} />
        </Link>
      </div>

      {/* Complete state */}
      {allComplete && !roles.every((r) => r.total <= 1) && (
        <div
          className="flex items-center gap-2 p-2.5 rounded-xl mb-3"
          style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
        >
          <CheckCircle2 size={14} style={{ color: '#10b981' }} />
          <span className="text-xs font-semibold" style={{ color: '#10b981' }}>
            {t.complete}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
            {t.completeDesc}
          </span>
        </div>
      )}

      {/* Empty state */}
      {roles.every((r) => r.total <= 1) && (
        <p className="text-xs py-2" style={{ color: 'var(--color-text-tertiary)' }}>
          {t.empty}
        </p>
      )}

      {/* Role rows */}
      <div className="space-y-2">
        {roles
          .filter((r) => r.total > 1)
          .map((role) => (
            <Link
              key={role.label}
              href={`/dashboard/fkd?tab=${role.label.toLowerCase()}`}
              className="flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-white/5"
            >
              <div className="p-1.5 rounded-md flex-shrink-0" style={{ background: `${role.color}18`, color: role.color }}>
                {role.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                    {role.label}
                  </span>
                  <span className="text-[10px] font-bold" style={{ color: role.color }}>
                    {role.count}/{role.total}
                  </span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, role.total > 0 ? (role.count / role.total) * 100 : 0)}%`,
                      background: role.color,
                    }}
                  />
                </div>
              </div>
            </Link>
          ))}
      </div>
    </div>
  )
}
