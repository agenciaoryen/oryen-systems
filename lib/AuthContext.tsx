'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

type UserProfile = {
  role: string | null
  org_id: string | null
  language: string | null
  currency: string | null
  timezone: string | null
  name: string | null
}

type AppUser = User & UserProfile

// Aceita planos novos (v2) e legados (v1) que podem existir no banco
type PlanName = 'starter' | 'pro' | 'business' | 'enterprise' | 'basic' | 'gold' | 'diamond'
type PlanStatus = 'active' | 'trial' | 'past_due' | 'canceled'

type Org = {
  id: string
  name: string
  plan: PlanName
  plan_status: PlanStatus
  plan_started_at: string | null
  niche: string | null
}

type AuthContextType = {
  // Autenticação básica
  loading: boolean
  user: AppUser | null
  org: Org | null
  
  // ═══ Sistema Staff Multi-Org ═══
  isStaff: boolean
  availableOrgs: Org[]
  selectedOrgId: string | null
  setSelectedOrgId: (id: string) => void
  
  // Helper principal - use este em todos os módulos!
  activeOrgId: string | null
  activeOrgName: string
  activeOrg: Org | null  // <-- NOVO: org ativa (para staff = org selecionada)
  
  // ═══ NOVO: Helpers de Plano ═══
  activePlan: PlanName
  activePlanStatus: PlanStatus
}

const AuthContext = createContext<AuthContextType>({
  loading: true,
  user: null,
  org: null,
  // Staff
  isStaff: false,
  availableOrgs: [],
  selectedOrgId: null,
  setSelectedOrgId: () => {},
  activeOrgId: null,
  activeOrgName: 'Organização',
  activeOrg: null,
  // Plano
  activePlan: 'starter',
  activePlanStatus: 'active',
})

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

export function AuthProvider({ children }: { children: ReactNode }) {
  // Estados originais
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<AppUser | null>(null)
  const [org, setOrg] = useState<Org | null>(null)
  
  // ═══ ESTADOS PARA STAFF ═══
  const [availableOrgs, setAvailableOrgs] = useState<Org[]>([])
  const [selectedOrgId, setSelectedOrgIdState] = useState<string | null>(null)

  // Derivado: é staff?
  const isStaff = user?.role === 'staff'

  // ─── Função para trocar org (com persistência) ───
  const setSelectedOrgId = useCallback((id: string) => {
    setSelectedOrgIdState(id)
    // Persistir no localStorage para manter entre reloads/navegação
    if (typeof window !== 'undefined') {
      localStorage.setItem('staff_selected_org_id', id)
    }
  }, [])

  // ─── Valores derivados ───
  // activeOrgId: para staff é a org selecionada, para usuário normal é a org do perfil
  const activeOrgId = isStaff ? selectedOrgId : (org?.id || null)
  
  // Org selecionada (para staff)
  const selectedOrg = availableOrgs.find(o => o.id === selectedOrgId) || null
  
  // activeOrgName: nome da org ativa
  const activeOrgName = isStaff 
    ? (selectedOrg?.name || 'Selecione uma organização')
    : (org?.name || 'Organização')

  // ═══ Plano ativo ═══
  // Para staff: usa a org selecionada do availableOrgs
  // Para usuário normal: usa a org do perfil
  const activeOrg = isStaff ? selectedOrg : org
  const activePlan: PlanName = activeOrg?.plan || 'starter'
  const activePlanStatus: PlanStatus = activeOrg?.plan_status || 'active'

  // ─── Migração: localStorage → cookies (one-time) ───
  useEffect(() => {
    const LEGACY_KEY = 'supabase.auth.token'
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(LEGACY_KEY)
    if (!stored) return
    try {
      const parsed = JSON.parse(stored)
      if (parsed?.access_token && parsed?.refresh_token) {
        supabase.auth.setSession({
          access_token: parsed.access_token,
          refresh_token: parsed.refresh_token,
        }).then(() => {
          localStorage.removeItem(LEGACY_KEY)
        }).catch(() => {
          localStorage.removeItem(LEGACY_KEY)
        })
      } else {
        localStorage.removeItem(LEGACY_KEY)
      }
    } catch {
      localStorage.removeItem(LEGACY_KEY)
    }
  }, [])

  // ─── Effect principal de autenticação ───
  useEffect(() => {
    const fetchUserData = async (sessionUser: User) => {
      try {
        // Busca Profile
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', sessionUser.id)
          .maybeSingle()

        // Monta objeto do usuário
        const appUser: AppUser = { 
          ...sessionUser, 
          role: profile?.role ?? 'user',
          org_id: profile?.org_id ?? null,
          language: profile?.language ?? 'pt',
          currency: profile?.currency ?? 'BRL',
          timezone: profile?.timezone ?? 'America/Sao_Paulo',
          name: profile?.name ?? null
        }

        setUser(appUser)

        // ═══ LÓGICA STAFF ═══
        if (appUser.role === 'staff') {
          // Staff: carregar TODAS as organizações (com campos de plano)
          const { data: orgsData } = await supabase
            .from('orgs')
            .select('id, name, plan, plan_status, plan_started_at, niche')
            .order('name')
          
          // Garantir valores default para plan
          const orgs: Org[] = (orgsData || []).map(o => ({
            ...o,
            plan: o.plan || 'starter',
            plan_status: o.plan_status || 'active',
            plan_started_at: o.plan_started_at || null,
            niche: o.niche || null
          }))
          
          setAvailableOrgs(orgs)
          
          // Recuperar última org selecionada do localStorage
          const savedOrgId = typeof window !== 'undefined' 
            ? localStorage.getItem('staff_selected_org_id') 
            : null
            
          if (savedOrgId && orgs.some(o => o.id === savedOrgId)) {
            setSelectedOrgIdState(savedOrgId)
          } else if (orgs.length > 0) {
            // Se não tem salvo, seleciona a primeira
            setSelectedOrgIdState(orgs[0].id)
          }
          
          // Staff não tem org própria
          setOrg(null)
          
        } else {
          // Usuário normal: buscar apenas sua org (com campos de plano)
          if (appUser.org_id) {
            const { data: orgData } = await supabase
              .from('orgs')
              .select('id, name, plan, plan_status, plan_started_at, niche')
              .eq('id', appUser.org_id)
              .maybeSingle()
            
            if (orgData) {
              setOrg({
                ...orgData,
                plan: orgData.plan || 'starter',
                plan_status: orgData.plan_status || 'active',
                plan_started_at: orgData.plan_started_at || null,
                niche: orgData.niche || null
              })
            } else {
              setOrg(null)
            }
          } else {
            setOrg(null)
          }
          
          // Limpar dados de staff
          setAvailableOrgs([])
          setSelectedOrgIdState(null)
        }

      } catch (error) {
        console.error("Erro ao carregar dados:", error)
        // Fallback de segurança
        setUser({ 
          ...sessionUser, 
          role: 'user', 
          org_id: null,
          language: 'pt',
          currency: 'BRL',
          timezone: 'America/Sao_Paulo',
          name: null
        })
        setOrg(null)
      } finally {
        setLoading(false)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          fetchUserData(session.user)
        } else {
          // Logout - limpar tudo
          setUser(null)
          setOrg(null)
          setAvailableOrgs([])
          setSelectedOrgIdState(null)
          setLoading(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ 
      // Originais
      loading, 
      user, 
      org,
      // Staff
      isStaff,
      availableOrgs,
      selectedOrgId,
      setSelectedOrgId,
      activeOrgId,
      activeOrgName,
      activeOrg,
      // Plano
      activePlan,
      activePlanStatus,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook principal - acesso completo ao contexto
 */
export const useAuth = () => useContext(AuthContext)

/**
 * Hook simplificado - retorna apenas o ID da org ativa
 * USE ESTE EM TODOS OS MÓDULOS para queries no Supabase
 * 
 * @example
 * const orgId = useActiveOrgId()
 * const { data } = await supabase.from('leads').select('*').eq('org_id', orgId)
 */
export const useActiveOrgId = (): string | null => {
  const { activeOrgId } = useContext(AuthContext)
  return activeOrgId
}

/**
 * Hook para verificar se é staff
 */
export const useIsStaff = (): boolean => {
  const { isStaff } = useContext(AuthContext)
  return isStaff
}

/**
 * Hook para obter o plano ativo
 * 
 * @example
 * const { plan, status } = useActivePlan()
 * if (plan === 'starter') { showUpgradePrompt() }
 */
export const useActivePlan = (): { plan: PlanName; status: PlanStatus } => {
  const { activePlan, activePlanStatus } = useContext(AuthContext)
  return { plan: activePlan, status: activePlanStatus }
}