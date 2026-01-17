'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

// 1. Atualizamos a tipagem para incluir as configs globais
type UserProfile = {
  role: string | null
  org_id: string | null
  language: string | null // pt, en, es
  currency: string | null // BRL, USD, CLP...
  timezone: string | null // America/Sao_Paulo...
}

type AppUser = User & UserProfile

type Org = {
  id: string
  name: string
}

type AuthContextType = {
  loading: boolean
  user: AppUser | null
  org: Org | null
}

const AuthContext = createContext<AuthContextType>({
  loading: true,
  user: null,
  org: null,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<AppUser | null>(null)
  const [org, setOrg] = useState<Org | null>(null)

  useEffect(() => {
    const fetchUserData = async (sessionUser: User) => {
      try {
        // Busca Profile (o .select('*') já traz as novas colunas automaticamente)
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', sessionUser.id)
          .maybeSingle()

        // 2. Monta objeto do usuário com os novos campos e fallbacks seguros
        const appUser: AppUser = { 
          ...sessionUser, 
          role: profile?.role ?? 'user',
          org_id: profile?.org_id ?? null,
          // Configurações Globais (padrão Brasil se não houver)
          language: profile?.language ?? 'pt',
          currency: profile?.currency ?? 'BRL',
          timezone: profile?.timezone ?? 'America/Sao_Paulo'
        }

        // Busca Org
        let orgData: Org | null = null
        if (appUser.org_id) {
          const { data } = await supabase
            .from('orgs')
            .select('*')
            .eq('id', appUser.org_id)
            .maybeSingle()
          orgData = data
        }

        setUser(appUser)
        setOrg(orgData)
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
      } finally {
        setLoading(false)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          fetchUserData(session.user)
        } else {
          setUser(null)
          setOrg(null)
          setLoading(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ loading, user, org }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)