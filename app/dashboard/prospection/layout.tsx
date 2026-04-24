// Gate de acesso ao módulo Prospecção.
// Só orgs do nicho ai_agency veem o módulo. Outros nichos são redirecionados.

'use client'

import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const NICHES_WITH_PROSPECTION = ['ai_agency']

export default function ProspectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { org, selectedOrg, user, loading } = useAuth()
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  const isStaff = user?.role === 'staff'
  const activeOrg = isStaff ? selectedOrg : org
  const niche = activeOrg?.niche ?? null

  useEffect(() => {
    if (loading) return
    if (isStaff && !selectedOrg) {
      // Staff sem org selecionada — manda pro seletor
      router.replace('/dashboard/staff')
      return
    }
    if (!niche || !NICHES_WITH_PROSPECTION.includes(niche)) {
      router.replace('/dashboard')
      return
    }
    setChecked(true)
  }, [loading, niche, isStaff, selectedOrg, router])

  if (loading || !checked) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
