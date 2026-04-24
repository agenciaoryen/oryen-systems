// lib/format/useLeadNameFormatter.ts
// Hook React que injeta orgNiche + lang automaticamente do AuthContext.
// Use em vez de chamar formatLeadName diretamente quando estiver dentro de
// componente React — evita ter que passar orgNiche/lang em todas as props.

'use client'

import { useAuth } from '@/lib/AuthContext'
import { formatLeadName, formatLeadInitial, type LeadLike, type Lang } from './leadName'

export function useLeadNameFormatter() {
  const { user, activeOrg } = useAuth()
  const lang = (((user as any)?.language) as Lang) || 'pt'
  const orgNiche = (activeOrg as any)?.niche as string | null | undefined

  return {
    formatName: (lead: LeadLike | null | undefined, opts?: { usePhoneFallback?: boolean }) =>
      formatLeadName(lead, orgNiche, { lang, ...opts }),
    formatInitial: (lead: LeadLike | null | undefined) => formatLeadInitial(lead, orgNiche),
    orgNiche,
    lang,
  }
}
