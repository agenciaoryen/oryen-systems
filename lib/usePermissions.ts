'use client'

import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import {
  DEFAULT_VENDEDOR_PERMISSIONS,
  type OrgRole,
  type PermissionModule,
} from './permissions'

// ═══════════════════════════════════════════════════════════════════════════════
// Hook client-side para checar permissões do usuário logado
// ═══════════════════════════════════════════════════════════════════════════════

type UsePermissionsReturn = {
  loading: boolean
  roleSlug: string
  isStaff: boolean
  isAdmin: boolean
  can: (module: PermissionModule) => boolean
  role: OrgRole | null
}

export function usePermissions(): UsePermissionsReturn {
  const { user, activeOrgId, isStaff } = useAuth()
  const [role, setRole] = useState<OrgRole | null>(null)
  const [loading, setLoading] = useState(true)

  const roleSlug = (user?.role as string) || 'vendedor'
  const isAdmin = roleSlug === 'admin'

  useEffect(() => {
    let cancelled = false

    async function fetchRole() {
      setLoading(true)

      // staff/admin: não precisa consultar, sempre tem acesso
      if (isStaff || isAdmin) {
        if (!cancelled) {
          setRole(null)
          setLoading(false)
        }
        return
      }

      if (!activeOrgId || !roleSlug) {
        if (!cancelled) {
          setRole(null)
          setLoading(false)
        }
        return
      }

      const { data } = await supabase
        .from('org_roles')
        .select('*')
        .eq('org_id', activeOrgId)
        .eq('slug', roleSlug)
        .maybeSingle()

      if (!cancelled) {
        setRole((data as OrgRole) || null)
        setLoading(false)
      }
    }

    fetchRole()
    return () => {
      cancelled = true
    }
  }, [activeOrgId, roleSlug, isStaff, isAdmin])

  function can(module: PermissionModule): boolean {
    // staff e admin: sempre liberado
    if (isStaff || isAdmin) return true

    // Role customizado ou vendedor com permissões salvas
    if (role?.permissions && module in role.permissions) {
      return role.permissions[module] === true
    }

    // Fallback: vendedor sem registro no banco usa defaults
    if (roleSlug === 'vendedor') {
      return DEFAULT_VENDEDOR_PERMISSIONS[module] === true
    }

    // Role customizado sem permissão explícita: bloqueado
    return false
  }

  return {
    loading,
    roleSlug,
    isStaff,
    isAdmin,
    can,
    role,
  }
}
