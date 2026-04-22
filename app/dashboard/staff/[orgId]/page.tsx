// @ts-nocheck
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
// Data fetched via /api/staff/orgs/[orgId] (supabaseAdmin, bypasses RLS)
import { resolvePlanConfig, PLAN_CONFIGS, type PlanName } from '@/lib/planConfig'
import {
  ArrowLeft, Building2, Users, Bot, MessageSquare, Calendar,
  Crown, Zap, Star, Shield, Loader2, Clock, CheckCircle2,
  XCircle, AlertTriangle, ChevronDown, Smartphone, TrendingUp,
  CreditCard, Play, Pause, UserPlus, Mail, Globe, SlidersHorizontal,
  Plus, Minus, Save
} from 'lucide-react'
import { ADDON_CONFIGS, calculateAddonBonus, type AddonType } from '@/lib/addons'

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface OrgDetail {
  id: string
  name: string
  plan: string
  plan_status: string
  plan_started_at: string | null
  trial_ends_at: string | null
  niche: string | null
}

interface OrgUser {
  id: string
  full_name: string | null
  email: string
  role: string
  created_at: string
}

interface WhatsAppInstance {
  id: string
  instance_name: string
  status: string
  phone_number: string | null
  created_at: string
}

interface AgentRow {
  id: string
  name: string
  agent_type: string
  is_active: boolean
}

interface OrgAddon {
  id: string
  addon_type: string
  quantity: number
  status: string
}

const PLAN_COLORS: Record<string, { color: string; bg: string; icon: any }> = {
  starter: { color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', icon: Star },
  pro: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: Zap },
  business: { color: '#A855F7', bg: 'rgba(168,85,247,0.12)', icon: Crown },
  enterprise: { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', icon: Shield },
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Ativo', color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  trial: { label: 'Trial', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  past_due: { label: 'Inadimplente', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  canceled: { label: 'Cancelado', color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
}

const NICHE_LABELS: Record<string, string> = {
  real_estate: 'Imobiliária',
  ai_agency: 'Agência de IA',
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function StaffOrgDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orgId = params.orgId as string
  const { user, isStaff, loading: authLoading } = useAuth()

  const [org, setOrg] = useState<OrgDetail | null>(null)
  const [users, setUsers] = useState<OrgUser[]>([])
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [addons, setAddons] = useState<OrgAddon[]>([])
  const [loading, setLoading] = useState(true)
  const [leadCount, setLeadCount] = useState(0)
  const [messageCount, setMessageCount] = useState(0)

  // Trial/Plan change states
  const [showTrialModal, setShowTrialModal] = useState(false)
  const [trialPlan, setTrialPlan] = useState<PlanName>('pro')
  const [trialDays, setTrialDays] = useState(3)
  const [savingTrial, setSavingTrial] = useState(false)

  const [showPlanModal, setShowPlanModal] = useState(false)
  const [newPlan, setNewPlan] = useState<PlanName>('pro')
  const [newStatus, setNewStatus] = useState('active')
  const [savingPlan, setSavingPlan] = useState(false)

  // Guard
  useEffect(() => {
    if (!authLoading && (!user || !isStaff)) {
      router.replace('/dashboard')
    }
  }, [authLoading, user, isStaff, router])

  // Load org data via API (usa supabaseAdmin, bypass RLS)
  const loadData = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/staff/orgs/${orgId}`)
      if (!res.ok) throw new Error('Erro ao buscar org')
      const data = await res.json()

      setOrg(data.org)
      setUsers(data.users)
      setInstances(data.instances)
      setAgents(data.agents)
      setAddons(data.addons || [])
      setLeadCount(data.lead_count)
      setMessageCount(data.message_count)
    } catch (err) {
      console.error('Error loading org:', err)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    if (isStaff && orgId) loadData()
  }, [isStaff, orgId, loadData])

  // ─── ATIVAR TRIAL ───
  const handleActivateTrial = async () => {
    if (!org) return
    setSavingTrial(true)
    try {
      const res = await fetch('/api/staff/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: org.id, plan: trialPlan, days: trialDays }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao ativar trial')
      }
      await loadData()
      setShowTrialModal(false)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSavingTrial(false)
    }
  }

  // ─── ALTERAR PLANO ───
  const handleChangePlan = async () => {
    if (!org) return
    setSavingPlan(true)
    try {
      const res = await fetch('/api/staff/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: org.id, plan: newPlan, plan_status: newStatus }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao alterar plano')
      }
      await loadData()
      setShowPlanModal(false)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSavingPlan(false)
    }
  }

  if (authLoading || !isStaff || loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-text-secondary)' }} />
      </div>
    )
  }

  if (!org) {
    return (
      <div className="text-center py-20">
        <Building2 size={48} className="mx-auto mb-4" style={{ color: 'var(--color-text-disabled)' }} />
        <p style={{ color: 'var(--color-text-secondary)' }}>Organização não encontrada</p>
        <button onClick={() => router.push('/dashboard/staff')} className="mt-4 text-sm underline" style={{ color: 'var(--color-primary)' }}>
          Voltar
        </button>
      </div>
    )
  }

  const planConfig = resolvePlanConfig(org.plan)
  const planStyle = PLAN_COLORS[planConfig.name] || PLAN_COLORS.starter
  const statusStyle = STATUS_LABELS[org.plan_status] || STATUS_LABELS.trial
  const PlanIcon = planStyle.icon

  const trialActive = org.trial_ends_at && new Date(org.trial_ends_at) > new Date()
  const trialDaysLeft = trialActive
    ? Math.ceil((new Date(org.trial_ends_at!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/dashboard/staff')}
          className="p-2 rounded-xl transition-colors"
          style={{ background: 'var(--color-bg-elevated)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-bg-elevated)' }}
        >
          <ArrowLeft size={20} style={{ color: 'var(--color-text-secondary)' }} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
              {org.name}
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0"
              style={{ color: planStyle.color, background: planStyle.bg }}>
              <PlanIcon size={12} className="inline mr-1" style={{ verticalAlign: '-2px' }} />
              {planConfig.displayName}
            </span>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0"
              style={{ color: statusStyle.color, background: statusStyle.bg }}>
              {statusStyle.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {org.niche && <span>{NICHE_LABELS[org.niche] || org.niche}</span>}
            {org.plan_started_at && (
              <span>Plano desde {new Date(org.plan_started_at).toLocaleDateString('pt-BR')}</span>
            )}
          </div>
        </div>
      </div>

      {/* Trial Banner */}
      {trialActive && (
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <Clock size={20} style={{ color: '#F59E0B' }} />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: '#F59E0B' }}>
              Trial ativo - {trialDaysLeft} dia{trialDaysLeft !== 1 ? 's' : ''} restante{trialDaysLeft !== 1 ? 's' : ''}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Expira em {new Date(org.trial_ends_at!).toLocaleDateString('pt-BR')} as {new Date(org.trial_ends_at!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Usuarios', value: users.length, icon: Users, color: 'var(--color-primary)', limit: planConfig.limits.maxUsers },
          { label: 'Leads', value: leadCount, icon: TrendingUp, color: '#22C55E', limit: planConfig.limits.maxActiveLeads },
          { label: 'Com msgs', value: messageCount, icon: MessageSquare, color: '#8B5CF6' },
          { label: 'Agentes', value: agents.length, icon: Bot, color: '#F59E0B' },
          { label: 'WhatsApp', value: instances.length, icon: Smartphone, color: '#25D366', limit: planConfig.limits.maxWhatsappNumbers },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl p-3" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-2 mb-1">
              <stat.icon size={14} style={{ color: stat.color }} />
              <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>{stat.label}</span>
            </div>
            <p className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {stat.value}
              {stat.limit && (
                <span className="text-xs font-normal ml-1" style={{ color: 'var(--color-text-disabled)' }}>
                  / {stat.limit === -1 ? '∞' : stat.limit}
                </span>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => { setTrialPlan('pro'); setTrialDays(3); setShowTrialModal(true) }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.12)' }}
        >
          <Play size={16} /> Ativar Trial
        </button>
        <button
          onClick={() => { setNewPlan(planConfig.name); setNewStatus(org.plan_status); setShowPlanModal(true) }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'rgba(168,85,247,0.12)', color: '#A855F7', border: '1px solid rgba(168,85,247,0.25)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(168,85,247,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(168,85,247,0.12)' }}
        >
          <CreditCard size={16} /> Alterar Plano
        </button>
      </div>

      {/* Limit Overrides */}
      <LimitOverrides
        orgId={org.id}
        planConfig={planConfig}
        addons={addons}
        onUpdate={loadData}
      />

      {/* Users Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <Users size={16} style={{ color: 'var(--color-text-secondary)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Usuarios ({users.length})
          </h2>
        </div>
        {users.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm" style={{ color: 'var(--color-text-disabled)' }}>Nenhum usuario</p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {users.map(u => (
              <div key={u.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)' }}>
                  {(u.full_name || u.email)?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {u.full_name || 'Sem nome'}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>{u.email}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    color: u.role === 'admin' ? '#A855F7' : u.role === 'staff' ? '#3B82F6' : '#9CA3AF',
                    background: u.role === 'admin' ? 'rgba(168,85,247,0.12)' : u.role === 'staff' ? 'rgba(59,130,246,0.12)' : 'rgba(156,163,175,0.12)',
                  }}>
                  {u.role}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--color-text-disabled)' }}>
                  {new Date(u.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agents Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <Bot size={16} style={{ color: 'var(--color-text-secondary)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Agentes ({agents.length})
          </h2>
        </div>
        {agents.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm" style={{ color: 'var(--color-text-disabled)' }}>Nenhum agente configurado</p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {agents.map(a => (
              <div key={a.id} className="px-4 py-3 flex items-center gap-3">
                <Bot size={16} style={{ color: a.is_active ? '#22C55E' : 'var(--color-text-disabled)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{a.name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{a.agent_type}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    color: a.is_active ? '#22C55E' : '#6B7280',
                    background: a.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(107,114,128,0.12)',
                  }}>
                  {a.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WhatsApp Instances */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <Smartphone size={16} style={{ color: '#25D366' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            WhatsApp ({instances.length})
          </h2>
        </div>
        {instances.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm" style={{ color: 'var(--color-text-disabled)' }}>Nenhuma instancia conectada</p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {instances.map(inst => (
              <div key={inst.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: inst.status === 'connected' ? '#22C55E' : '#EF4444' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{inst.instance_name}</p>
                  {inst.phone_number && (
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{inst.phone_number}</p>
                  )}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    color: inst.status === 'connected' ? '#22C55E' : '#EF4444',
                    background: inst.status === 'connected' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                  }}>
                  {inst.status === 'connected' ? 'Conectado' : inst.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: ATIVAR TRIAL
          ═══════════════════════════════════════════════════════════════════════ */}
      {showTrialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--color-bg-overlay)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: 'rgba(245,158,11,0.12)' }}>
                <Play size={20} style={{ color: '#F59E0B' }} />
              </div>
              <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Ativar Trial</h3>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{org.name}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Plano do Trial</label>
                <select
                  value={trialPlan}
                  onChange={e => setTrialPlan(e.target.value as PlanName)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                >
                  <option value="pro">Pro</option>
                  <option value="business">Business</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Duracao (dias)</label>
                <select
                  value={trialDays}
                  onChange={e => setTrialDays(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                >
                  <option value={1}>1 dia</option>
                  <option value={2}>2 dias</option>
                  <option value={3}>3 dias</option>
                  <option value={5}>5 dias</option>
                  <option value={7}>7 dias</option>
                </select>
              </div>
            </div>

            <div className="rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                O plano sera alterado para <strong style={{ color: '#F59E0B' }}>{PLAN_CONFIGS[trialPlan].displayName}</strong> por{' '}
                <strong>{trialDays} dia{trialDays > 1 ? 's' : ''}</strong>. Apos o periodo, o plano volta para{' '}
                <strong>Starter</strong> com status <strong>trial</strong>.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowTrialModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleActivateTrial}
                disabled={savingTrial}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: '#F59E0B', color: '#000' }}
              >
                {savingTrial ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                {savingTrial ? 'Ativando...' : 'Ativar Trial'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: ALTERAR PLANO
          ═══════════════════════════════════════════════════════════════════════ */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--color-bg-overlay)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: 'rgba(168,85,247,0.12)' }}>
                <CreditCard size={20} style={{ color: '#A855F7' }} />
              </div>
              <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Alterar Plano</h3>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{org.name}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Plano</label>
                <select
                  value={newPlan}
                  onChange={e => setNewPlan(e.target.value as PlanName)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                >
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="business">Business</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Status</label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                >
                  <option value="active">Ativo</option>
                  <option value="trial">Trial</option>
                  <option value="past_due">Inadimplente</option>
                  <option value="canceled">Cancelado</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPlanModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleChangePlan}
                disabled={savingPlan}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: '#A855F7', color: '#fff' }}
              >
                {savingPlan ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {savingPlan ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: AJUSTE DE LIMITES (STAFF)
// ═══════════════════════════════════════════════════════════════════════════════

const LIMIT_ADJUSTMENTS: { addonType: AddonType; label: string; unitLabel: string; icon: any; color: string }[] = [
  { addonType: 'extra_users', label: 'Usuarios extras', unitLabel: 'usuarios', icon: Users, color: 'var(--color-primary)' },
  { addonType: 'extra_messages', label: 'Msgs IA extras', unitLabel: '(x2.000)', icon: MessageSquare, color: '#8B5CF6' },
  { addonType: 'extra_whatsapp', label: 'WhatsApp extras', unitLabel: 'numeros', icon: Smartphone, color: '#25D366' },
  { addonType: 'extra_sites', label: 'Sites extras', unitLabel: 'sites', icon: Globe, color: '#3B82F6' },
]

function LimitOverrides({
  orgId,
  planConfig,
  addons,
  onUpdate,
}: {
  orgId: string
  planConfig: ReturnType<typeof resolvePlanConfig>
  addons: OrgAddon[]
  onUpdate: () => void
}) {
  const [saving, setSaving] = useState<string | null>(null)

  const getAddonQty = (type: string) => {
    const addon = addons.find(a => a.addon_type === type && a.status === 'active')
    return addon?.quantity || 0
  }

  const handleChange = async (addonType: AddonType, delta: number) => {
    const current = getAddonQty(addonType)
    const newQty = Math.max(0, current + delta)

    setSaving(addonType)
    try {
      const res = await fetch('/api/staff/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, addon_type: addonType, quantity: newQty }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      onUpdate()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(null)
    }
  }

  const limitKeyMap: Record<AddonType, keyof typeof planConfig.limits> = {
    extra_users: 'maxUsers',
    extra_messages: 'maxMonthlyMessages',
    extra_whatsapp: 'maxWhatsappNumbers',
    extra_sites: 'maxSites',
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <SlidersHorizontal size={16} style={{ color: 'var(--color-text-secondary)' }} />
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Ajuste de Limites
        </h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.12)' }}>
          Staff
        </span>
      </div>

      <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
        {LIMIT_ADJUSTMENTS.map(({ addonType, label, unitLabel, icon: Icon, color }) => {
          const qty = getAddonQty(addonType)
          const config = ADDON_CONFIGS[addonType]
          const baseLimit = planConfig.limits[limitKeyMap[addonType]] ?? 0
          const bonus = qty * config.unitAmount
          const effective = baseLimit === -1 ? -1 : baseLimit + bonus
          const isSaving = saving === addonType

          return (
            <div key={addonType} className="px-4 py-3 flex items-center gap-3">
              <Icon size={16} style={{ color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {label}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  Base: {baseLimit === -1 ? '∞' : baseLimit}
                  {bonus > 0 && <span style={{ color: '#22C55E' }}> +{bonus}</span>}
                  {' = '}
                  <strong>{effective === -1 ? '∞' : effective}</strong>
                  {' '}{unitLabel}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleChange(addonType, -1)}
                  disabled={qty === 0 || isSaving}
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-all disabled:opacity-30"
                  style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
                >
                  <Minus size={12} style={{ color: 'var(--color-text-secondary)' }} />
                </button>

                <span className="w-8 text-center text-sm font-bold" style={{ color: qty > 0 ? '#22C55E' : 'var(--color-text-disabled)' }}>
                  {isSaving ? <Loader2 size={14} className="animate-spin mx-auto" style={{ color: 'var(--color-text-secondary)' }} /> : qty}
                </span>

                <button
                  onClick={() => handleChange(addonType, 1)}
                  disabled={isSaving}
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-all disabled:opacity-30"
                  style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
                >
                  <Plus size={12} style={{ color: 'var(--color-text-secondary)' }} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
