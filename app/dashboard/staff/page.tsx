// @ts-nocheck
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
// Data fetched via /api/staff/orgs (supabaseAdmin, bypasses RLS)
import {
  Building2, Users, Search, ChevronRight, Shield,
  Wifi, WifiOff, Bot, MessageSquare, Calendar,
  TrendingUp, Loader2, Crown, Zap, Star
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface OrgRow {
  id: string
  name: string
  plan: string
  plan_status: string
  niche: string | null
  created_at: string
  _user_count?: number
  _lead_count?: number
  _agent_count?: number
}

const PLAN_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  starter: { label: 'Starter', color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
  pro: { label: 'Pro', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  business: { label: 'Business', color: '#A855F7', bg: 'rgba(168,85,247,0.12)' },
  enterprise: { label: 'Enterprise', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  basic: { label: 'Basic', color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
  gold: { label: 'Gold', color: '#EAB308', bg: 'rgba(234,179,8,0.12)' },
  diamond: { label: 'Diamond', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
}

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Ativo', color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  trial: { label: 'Trial', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  past_due: { label: 'Inadimplente', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  canceled: { label: 'Cancelado', color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
}

const NICHE_LABELS: Record<string, string> = {
  real_estate: 'Imobiliária',
  insurance: 'Seguros',
  solar: 'Energia Solar',
  consulting: 'Consultoria',
  other: 'Outro',
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function StaffOrgsPage() {
  const router = useRouter()
  const { user, isStaff, loading: authLoading } = useAuth()

  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Guard: redirecionar se não for staff
  useEffect(() => {
    if (!authLoading && (!user || !isStaff)) {
      router.replace('/dashboard')
    }
  }, [authLoading, user, isStaff, router])

  // Carregar orgs via API (usa supabaseAdmin, bypass RLS)
  const loadOrgs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/staff/orgs')
      if (!res.ok) throw new Error('Erro ao buscar orgs')
      const data = await res.json()
      setOrgs(data)
    } catch (err) {
      console.error('Error loading orgs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isStaff) loadOrgs()
  }, [isStaff, loadOrgs])

  // Filtrar
  const filtered = orgs.filter(org => {
    if (search) {
      const q = search.toLowerCase()
      if (!org.name.toLowerCase().includes(q)) return false
    }
    if (filterPlan !== 'all' && org.plan !== filterPlan) return false
    if (filterStatus !== 'all' && org.plan_status !== filterStatus) return false
    return true
  })

  // Stats
  const totalOrgs = orgs.length
  const activeOrgs = orgs.filter(o => o.plan_status === 'active').length
  const trialOrgs = orgs.filter(o => o.plan_status === 'trial').length
  const totalLeads = orgs.reduce((sum, o) => sum + (o._lead_count || 0), 0)

  if (authLoading || !isStaff) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-text-secondary)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl" style={{ background: 'rgba(110, 95, 255, 0.12)' }}>
            <Shield size={24} style={{ color: 'var(--color-indigo)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Painel Staff
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Gestão de organizações e operações
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Organizações', value: totalOrgs, icon: Building2, color: 'var(--color-primary)' },
          { label: 'Ativas', value: activeOrgs, icon: TrendingUp, color: '#22C55E' },
          { label: 'Trial', value: trialOrgs, icon: Calendar, color: '#F59E0B' },
          { label: 'Total Leads', value: totalLeads.toLocaleString(), icon: Users, color: '#8B5CF6' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl p-4" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={16} style={{ color: stat.color }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{stat.label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-disabled)' }} />
          <input
            type="text"
            placeholder="Buscar organização..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </div>
        <select
          value={filterPlan}
          onChange={e => setFilterPlan(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
          style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
        >
          <option value="all">Todos os planos</option>
          <option value="basic">Basic</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="business">Business</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
          style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativo</option>
          <option value="trial">Trial</option>
          <option value="past_due">Inadimplente</option>
          <option value="canceled">Cancelado</option>
        </select>
      </div>

      {/* Orgs List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-text-secondary)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
          <Building2 size={40} className="mx-auto mb-3" style={{ color: 'var(--color-text-disabled)' }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>Nenhuma organização encontrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(org => {
            const plan = PLAN_BADGE[org.plan] || PLAN_BADGE.starter
            const status = STATUS_BADGE[org.plan_status] || STATUS_BADGE.trial

            return (
              <div
                key={org.id}
                onClick={() => router.push(`/dashboard/staff/${org.id}`)}
                className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all"
                style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-bg-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-bg-surface)' }}
              >
                {/* Icon */}
                <div className="p-2.5 rounded-xl shrink-0" style={{ background: 'var(--color-bg-elevated)' }}>
                  <Building2 size={20} style={{ color: 'var(--color-text-secondary)' }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {org.name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{ color: plan.color, background: plan.bg }}>
                      {plan.label}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{ color: status.color, background: status.bg }}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {org.niche && <span>{NICHE_LABELS[org.niche] || org.niche}</span>}
                    <span className="flex items-center gap-1"><Users size={12} /> {org._user_count}</span>
                    <span className="flex items-center gap-1"><MessageSquare size={12} /> {org._lead_count} leads</span>
                    <span className="flex items-center gap-1"><Bot size={12} /> {org._agent_count} agentes</span>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight size={18} style={{ color: 'var(--color-text-disabled)' }} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
