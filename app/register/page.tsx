'use client'

// Self-serve registration is disabled. Leads on the landing page must fill out
// the contact form (POST /api/landing-contact) so the sales team can qualify
// and onboard them with the right plan. Internal users are created via the
// /auth/accept-invite flow.

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/#contato')
  }, [router])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg-base, #0B0F1A)',
      color: 'var(--color-text-secondary, #94A3B8)',
      fontFamily: 'var(--font-body), -apple-system, sans-serif',
      fontSize: 14,
    }}>
      Redirecionando...
    </div>
  )
}
