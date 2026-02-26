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
}

type AppUser = User & UserProfile

type Org = {
  id: string
  name: string
}

type AuthContextType = {
  // Autenticação básica
  loading: boolean
  user: AppUser | null
  org: Org | null
  
  // ═══ NOVO: Sistema Staff Multi-Org ═══
  isStaff: boolean
  availableOrgs: Org[]
  selectedOrgId: string | null
  setSelectedOrgId: (id: string) => void
  
  // Helper principal - use este em todos os módulos!
  activeOrgId: string | null
  activeOrgName: string
}

const AuthContext = createContext<AuthContextType>({
  loading: true,
  user: null,
  org: null,
  // Novos valores default
  isStaff: false,
  availableOrgs: [],
  selectedOrgId: null,
  setSelectedOrgId: () => {},
  activeOrgId: null,
  activeOrgName: 'Organização',
})

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

export function AuthProvider({ children }: { children: ReactNode }) {
  // Estados originais
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<AppUser | null>(null)
  const [org, setOrg] = useState<Org | null>(null)
  
  // ═══ NOVOS ESTADOS PARA STAFF ═══
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
  
  // activeOrgName: nome da org ativa
  const selectedOrg = availableOrgs.find(o => o.id === selectedOrgId)
  const activeOrgName = isStaff 
    ? (selectedOrg?.name || 'Selecione uma organização')
    : (org?.name || 'Organização')

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
          timezone: profile?.timezone ?? 'America/Sao_Paulo'
        }

        setUser(appUser)

        // ═══ LÓGICA STAFF ═══
        if (appUser.role === 'staff') {
          // Staff: carregar TODAS as organizações
          const { data: orgsData } = await supabase
            .from('orgs')
            .select('id, name')
            .order('name')
          
          const orgs = orgsData || []
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
          // Usuário normal: buscar apenas sua org
          if (appUser.org_id) {
            const { data: orgData } = await supabase
              .from('orgs')
              .select('id, name')
              .eq('id', appUser.org_id)
              .maybeSingle()
            
            setOrg(orgData)
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
          timezone: 'America/Sao_Paulo'
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
      // Novos
      isStaff,
      availableOrgs,
      selectedOrgId,
      setSelectedOrgId,
      activeOrgId,
      activeOrgName,
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